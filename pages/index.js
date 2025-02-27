import { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, BarChart, Bar
} from "recharts";
import "../styles/styles.css"; // Import Updated Styling

export default function Home() {
  const [dept, setDept] = useState("");
  const [course, setCourse] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [professorData, setProfessorData] = useState([]);
  const [selectedProfessors, setSelectedProfessors] = useState([]);
  const [bestProfessor, setBestProfessor] = useState(null);

  // Color palette for different professor lines
  const colorPalette = [
    "#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#FFC300", "#00E0FF",
    "#A633FF", "#33FFA1", "#FF7733", "#00FF99", "#FF3383", "#33D4FF",
    "#FF4500", "#2E8B57", "#4682B4", "#C71585", "#FFD700", "#40E0D0",
    "#800080", "#00FA9A", "#FF6347", "#32CD32", "#FF69B4", "#1E90FF",
    "#DC143C", "#228B22", "#4169E1", "#8A2BE2", "#DAA520", "#20B2AA",
    "#9400D3", "#00FF7F", "#FF8C00", "#00CED1", "#FF1493", "#87CEEB"
];


  // Semester order for correct sorting
  const semesterOrder = { "SPRING": 1, "SUMMER": 2, "FALL": 3 };

  const fetchData = async () => {
    if (!dept || !course) return;

    setLoading(true);
    try {
      console.log("Fetching data...");

      const response = await axios.post(
        "/api/proxy",
        new URLSearchParams({ dept, number: course }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 5000 }
      );

      console.log("API Response:", response.data);

      if (response.data && response.data.classes) {
        let classes = response.data.classes.map((item) => ({
          yearSemester: `${item.year} ${item.semester}`,
          year: parseInt(item.year),
          semester: item.semester,
          gpa: parseFloat(item.gpa),
          prof: item.prof,
          section: item.section,
          A: parseInt(item.A),
          B: parseInt(item.B),
          C: parseInt(item.C),
          D: parseInt(item.D),
          F: parseInt(item.F),
        }));

        // ✅ **Sorting: From Earliest to Latest**
        classes.sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return semesterOrder[a.semester] - semesterOrder[b.semester];
        });

        setData(classes);

        // Process professor-wise data
        const profGPAs = classes.reduce((acc, curr) => {
          if (curr.prof && curr.gpa) {
            acc[curr.prof] = acc[curr.prof]
              ? [...acc[curr.prof], { gpa: curr.gpa, yearSemester: curr.yearSemester }]
              : [{ gpa: curr.gpa, yearSemester: curr.yearSemester }];
          }
          return acc;
        }, {});

        // Generate professor statistics
        const processedProfessors = Object.keys(profGPAs).map((prof) => ({
          professor: prof,
          avgGpa:
            profGPAs[prof].reduce((sum, val) => sum + val.gpa, 0) / profGPAs[prof].length,
          history: profGPAs[prof].slice().sort((a, b) => {  
            const [yearA, semesterA] = a.yearSemester.split(" ");
            const [yearB, semesterB] = b.yearSemester.split(" ");
            
            const yearNumA = parseInt(yearA);
            const yearNumB = parseInt(yearB);
            
            if (yearNumA !== yearNumB) return yearNumA - yearNumB;
            return semesterOrder[semesterA] - semesterOrder[semesterB];
          }),
        }));

        // Sort professors by GPA
        const sortedProfessors = processedProfessors.sort((a, b) => b.avgGpa - a.avgGpa);
        setProfessorData(sortedProfessors);
        setBestProfessor(sortedProfessors[0] || null);
        setSelectedProfessors(sortedProfessors.map((p) => p.professor));
      } else {
        setData([]);
        setProfessorData([]);
        setBestProfessor(null);
      }
    } catch (error) {
      console.error("Error fetching data:", error.message);
      alert("Failed to fetch data. Check API availability.");
      setData([]);
      setProfessorData([]);
      setBestProfessor(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [dept, course]);

  return (
    <div className="container">
      <h1 className="title">BetterAnex Grades</h1>

      <div className="input-group">
        <input type="text" placeholder="Department (e.g., CSCE)" value={dept} onChange={(e) => setDept(e.target.value.toUpperCase())} className="input-box" />
        <input type="text" placeholder="Course Number (e.g., 221)" value={course} onChange={(e) => setCourse(e.target.value)} className="input-box" />
      </div>

      {bestProfessor && (
        <div className="best-professor">
          <h2>🏆 Best Professor</h2>
          <p>{bestProfessor.professor}</p>
          <p>Avg GPA: {bestProfessor.avgGpa.toFixed(2)}</p>
        </div>
      )}

      <div className="dashboard">
        <div className="chart-container">
          <h2>📈 GPA Over the Years</h2>
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
              dataKey="yearSemester"
              angle={-30}
              textAnchor="end"
              height={80}
              allowDuplicatedCategory={false}
              interval={0} // Ensures all labels are displayed
              // domain={["dataMin", "dataMax"]} // Keeps the range dynamic
              tick={{ fontSize: 12, fill: "#FFFFFF" }}
              tickFormatter={(tick) => {
                const [year, semester] = tick.split(" ");
                return `${semester} ${year}`; // Formats "SPRING 2023" correctly
              }}
            />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedProfessors.map((prof, index) => {
                const profData = professorData.find((p) => p.professor === prof);
                return profData ? (
                  <Line
                    key={prof}
                    data={profData.history}
                    dataKey="gpa"
                    name={prof}
                    stroke={colorPalette[index % colorPalette.length]}
                    strokeWidth={2}
                  />
                ) : null;
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table for Grade Distribution */}
      <div className="table-container">
        <h2>📊 Grade Distribution</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Semester</th>
              <th>Professor</th>
              <th>GPA</th>
              <th>A</th>
              <th>B</th>
              <th>C</th>
              <th>D</th>
              <th>F</th>
            </tr>
          </thead>
          <tbody>
            {[...data].sort((a, b) => {
              if (a.year !== b.year) return b.year - a.year; // Descending order for latest years first
              return semesterOrder[b.semester] - semesterOrder[a.semester]; // Ensure semester sorting
            }).map((row, index) => (
              <tr key={index}>
                <td>{row.year}</td>
                <td>{row.semester}</td>
                <td>{row.prof}</td>
                <td>{row.gpa}</td>
                <td>{row.A}</td>
                <td>{row.B}</td>
                <td>{row.C}</td>
                <td>{row.D}</td>
                <td>{row.F}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
