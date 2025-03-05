import React, { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css"; // Bootstrap for layout, etc.
import styles from "../styles/styles.module.css";

// Recharts Imports
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  ReferenceLine,
} from "recharts";

/** COLORS **/
const colorPalette = [
  "#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#FFC300", "#00E0FF", "#A633FF", "#33FFA1",
  "#FF7733", "#00FF99", "#FF3383", "#33D4FF", "#FF4500", "#2E8B57", "#4682B4", "#C71585",
  "#FFD700", "#40E0D0", "#800080", "#00FA9A",
];

const gradeColors = {
  A: "#4caf50",
  B: "#2196f3",
  C: "#ffc107",
  D: "#ff9800",
  F: "#f44336",
  I: "#9c27b0",
  Q: "#607d8b", // Q grade color
};

export default function HomePage() {
  const [dept, setDept] = useState("");
  const [course, setCourse] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------- Raw and Derived Data ----------
  const [rawData, setRawData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [professorData, setProfessorData] = useState([]);
  const [bestProfessor, setBestProfessor] = useState(null);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [stackedData, setStackedData] = useState([]);
  const [professorGradeDistributions, setProfessorGradeDistributions] = useState({});

  // ---------- Misc. States ----------
  const [selectedProfessors, setSelectedProfessors] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [onlyFive, setOnlyFive] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [yearRange, setYearRange] = useState("all");
  const [gradeDistView, setGradeDistView] = useState("combined");

  // ---------- Bookmarks ----------
  const [bookmarks, setBookmarks] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bookmarks");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Add new state for professor list collapse
  const [isProfessorListCollapsed, setIsProfessorListCollapsed] = useState(false);

  // Save bookmarks to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
    }
  }, [bookmarks]);

  // ---------- Close bookmark dropdown on scroll ----------
  useEffect(() => {
    function handleScroll() {
      setShowBookmarks(false);
    }
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Utility for semester sorting
  const semesterOrder = { SPRING: 1, SUMMER: 2, FALL: 3 };

  // ---------- FILTER DATA FOR TIME RANGE ----------
  const getTimeFilteredData = () => {
    if (yearRange === "all") {
      return rawData;
    }
    const currentYear = new Date().getFullYear();
    const years = parseInt(yearRange);
    return rawData.filter((r) => r.year >= currentYear - years);
  };

  // ---------- FETCH DATA FROM API ----------
  async function fetchData(deptParam, courseParam) {
    const deptToUse = deptParam || dept;
    const courseToUse = courseParam || course;
    if (!deptToUse || !courseToUse) return;

    // Clear existing data before loading
    setRawData([]);
    setChartData([]);
    setTableData([]);
    setProfessorData([]);
    setBestProfessor(null);
    setGradeDistribution([]);
    setGroupedData({});
    setStackedData([]);
    setSelectedProfessors([]);
    setExpandedGroups({});
    setLoading(true);

    try {
      const response = await axios.post(
        "/api/proxy",
        new URLSearchParams({ dept: deptToUse, number: courseToUse }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 5000 }
      );
      const resData = response.data;

      if (resData && resData.classes && resData.classes.length > 0) {
        const classes = resData.classes.map((cls) => {
          // Ensure all numeric values are properly parsed
          const A = parseInt(cls.A, 10) || 0;
          const B = parseInt(cls.B, 10) || 0;
          const C = parseInt(cls.C, 10) || 0;
          const D = parseInt(cls.D, 10) || 0;
          const F = parseInt(cls.F, 10) || 0;
          const I = parseInt(cls.I, 10) || 0;
          const Q = parseInt(cls.Q, 10) || 0;

          const totalStudents = A + B + C + D + F + I + Q;
          const gpa = cls.gpa ? parseFloat(cls.gpa) : NaN;

          return {
            year: parseInt(cls.year, 10),
            semester: cls.semester,
            yearSemester: `${cls.year} ${cls.semester}`,
            professor: cls.prof,
            gpa: gpa,
            totalStudents,
            section: cls.section || "-",
            A,
            B,
            C,
            D,
            F,
            I,
            Q,
          };
        });
        setRawData(classes);
        // Set year range to 'all' for new data
        setYearRange("all");
      } else {
        setRawData([]);
        alert("No data found for this class.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to fetch data. Check API availability.");
      setRawData([]);
    }
    setLoading(false);
  }

  // ---------- DERIVE PROFESSOR DATA (A) ----------
  useEffect(() => {
    if (rawData.length === 0) {
      setProfessorData([]);
      return;
    }
    const dataToUse = getTimeFilteredData();
    const profMap = {};

    dataToUse.forEach((c) => {
      if (!c.professor || isNaN(c.gpa)) return;
      if (!profMap[c.professor]) {
        profMap[c.professor] = { weightedGPA: 0, totalStudents: 0 };
      }
      profMap[c.professor].weightedGPA += c.gpa * c.totalStudents;
      profMap[c.professor].totalStudents += c.totalStudents;
    });

    const processedProfs = Object.keys(profMap).map((prof) => {
      const { weightedGPA, totalStudents } = profMap[prof];
      const avg = totalStudents ? weightedGPA / totalStudents : 0;
      return { professor: prof, avgGpa: avg };
    });
    processedProfs.sort((a, b) => b.avgGpa - a.avgGpa);

    // Assign colors from colorPalette
    const processedProfsColored = processedProfs.map((p, idx) => ({
      ...p,
      color: colorPalette[idx % colorPalette.length],
    }));
    setProfessorData(processedProfsColored);

    // Only select all professors if none are selected
    if (selectedProfessors.length === 0) {
      setSelectedProfessors(processedProfsColored.map((p) => p.professor));
    }
  }, [rawData, yearRange]);

  // ---------- DERIVE CHART/TABLE DATA (B) ----------
  useEffect(() => {
    if (rawData.length === 0) {
      setChartData([]);
      setTableData([]);
      setBestProfessor(null);
      setGradeDistribution([]);
      setGroupedData({});
      setStackedData([]);
      return;
    }
    const dataToUse = getTimeFilteredData();
    const filteredData = dataToUse.filter((item) =>
      selectedProfessors.includes(item.professor)
    );

    // 1) Table data (descending order)
    const tableDataSorted = [...filteredData].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return semesterOrder[b.semester] - semesterOrder[a.semester];
    });
    setTableData(tableDataSorted);

    // 2) Build line chart data
    const chartDict = {};
    filteredData.forEach((item) => {
      if (!item.year || !item.semester || !item.professor || isNaN(item.gpa)) return;
      const ySem = `${item.year} ${item.semester}`;
      if (!chartDict[ySem]) chartDict[ySem] = {};
      if (!chartDict[ySem][item.professor]) {
        chartDict[ySem][item.professor] = { weightedGPA: 0, totalStudents: 0 };
      }
      chartDict[ySem][item.professor].weightedGPA += item.gpa * item.totalStudents;
      chartDict[ySem][item.professor].totalStudents += item.totalStudents;
    });

    const allYearSemesters = Object.keys(chartDict);
    allYearSemesters.sort((a, b) => {
      const [yearA, semA] = a.split(" ");
      const [yearB, semB] = b.split(" ");
      const diffYear = parseInt(yearA, 10) - parseInt(yearB, 10);
      if (diffYear !== 0) return diffYear;
      return semesterOrder[semA] - semesterOrder[semB];
    });

    const rowData = allYearSemesters.map((ySem) => {
      const rowObj = { yearSemester: ySem };
      for (const prof in chartDict[ySem]) {
        const { weightedGPA, totalStudents } = chartDict[ySem][prof];
        const avgGpa = totalStudents ? weightedGPA / totalStudents : NaN;
        rowObj[prof] = isNaN(avgGpa) ? null : parseFloat(avgGpa.toFixed(3));
      }
      return rowObj;
    });
    setChartData(rowData);

    // 3) Compute best professor
    const profMapFiltered = {};
    filteredData.forEach((c) => {
      if (!c.professor || isNaN(c.gpa)) return;
      if (!profMapFiltered[c.professor]) {
        profMapFiltered[c.professor] = { weightedGPA: 0, totalStudents: 0 };
      }
      profMapFiltered[c.professor].weightedGPA += c.gpa * c.totalStudents;
      profMapFiltered[c.professor].totalStudents += c.totalStudents;
    });
    const processedProfsFiltered = Object.keys(profMapFiltered).map((prof) => {
      const { weightedGPA, totalStudents } = profMapFiltered[prof];
      const avg = totalStudents ? weightedGPA / totalStudents : 0;
      return { professor: prof, avgGpa: avg };
    });
    processedProfsFiltered.sort((a, b) => b.avgGpa - a.avgGpa);
    setBestProfessor(
      processedProfsFiltered.length > 0 ? processedProfsFiltered[0] : null
    );

    // 4) Donut distribution (grade totals)
    const totalAs = filteredData.reduce((acc, c) => acc + c.A, 0);
    const totalBs = filteredData.reduce((acc, c) => acc + c.B, 0);
    const totalCs = filteredData.reduce((acc, c) => acc + c.C, 0);
    const totalDs = filteredData.reduce((acc, c) => acc + c.D, 0);
    const totalFs = filteredData.reduce((acc, c) => acc + c.F, 0);
    const totalIs = filteredData.reduce((acc, c) => acc + c.I, 0);
    const totalQs = filteredData.reduce((acc, c) => acc + c.Q, 0);

    setGradeDistribution([
      { name: "A", value: totalAs },
      { name: "B", value: totalBs },
      { name: "C", value: totalCs },
      { name: "D", value: totalDs },
      { name: "F", value: totalFs },
      { name: "I", value: totalIs },
      { name: "Q", value: totalQs },
    ]);

    // 5) Group data for collapsible table
    const grouped = {};
    tableDataSorted.forEach((row) => {
      const groupKey = `${row.year}-${row.semester}-${row.professor}`;
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      // Ensure all numeric values are properly parsed
      const processedRow = {
        ...row,
        A: parseInt(row.A, 10) || 0,
        B: parseInt(row.B, 10) || 0,
        C: parseInt(row.C, 10) || 0,
        D: parseInt(row.D, 10) || 0,
        F: parseInt(row.F, 10) || 0,
        I: parseInt(row.I, 10) || 0,
        Q: parseInt(row.Q, 10) || 0,
        gpa: parseFloat(row.gpa) || NaN,
        section: row.section || "-",
      };
      grouped[groupKey].push(processedRow);
    });

    // Add empty entries for professors with no data in certain years
    selectedProfessors.forEach((prof) => {
      const years = [...new Set(tableDataSorted.map((r) => r.year))];
      years.forEach((year) => {
        const semesters = ["SPRING", "SUMMER", "FALL"];
        semesters.forEach((sem) => {
          const key = `${year}-${sem}-${prof}`;
          if (!grouped[key]) {
            grouped[key] = [
              {
                year: year,
                semester: sem,
                professor: prof,
                gpa: NaN,
                section: "-",
                A: 0,
                B: 0,
                C: 0,
                D: 0,
                F: 0,
                I: 0,
                Q: 0,
              },
            ];
          }
        });
      });
    });

    setGroupedData(grouped);

    // 6) Normalized Stacked Chart
    const stackedDict = {};
    filteredData.forEach((r) => {
      const yKey = r.year;
      if (!stackedDict[yKey]) {
        stackedDict[yKey] = { A: 0, B: 0, C: 0, D: 0, F: 0, I: 0, Q: 0 };
      }
      stackedDict[yKey].A += r.A;
      stackedDict[yKey].B += r.B;
      stackedDict[yKey].C += r.C;
      stackedDict[yKey].D += r.D;
      stackedDict[yKey].F += r.F;
      stackedDict[yKey].I += r.I;
      stackedDict[yKey].Q += r.Q;
    });
    const stArr = Object.keys(stackedDict).map((y) => {
      const total = Object.values(stackedDict[y]).reduce((sum, val) => sum + val, 0);
      if (total === 0) {
        return { year: y, A: 0, B: 0, C: 0, D: 0, F: 0, I: 0, Q: 0 };
      }
      return {
        year: y,
        A: stackedDict[y].A / total,
        B: stackedDict[y].B / total,
        C: stackedDict[y].C / total,
        D: stackedDict[y].D / total,
        F: stackedDict[y].F / total,
        I: stackedDict[y].I / total,
        Q: stackedDict[y].Q / total,
      };
    });
    stArr.sort((a, b) => parseInt(a.year) - parseInt(b.year));
    setStackedData(stArr);

    // Calculate individual professor grade distributions
    const profDistributions = {};
    selectedProfessors.forEach((prof) => {
      const profData = stArr.map((year) => {
        const yearData = filteredData.filter(
          (r) => r.year === parseInt(year.year) && r.professor === prof
        );

        if (yearData.length === 0) {
          return {
            year: year.year,
            A: 0,
            B: 0,
            C: 0,
            D: 0,
            F: 0,
            I: 0,
            Q: 0,
          };
        }

        const total = yearData.reduce(
          (sum, r) => sum + r.A + r.B + r.C + r.D + r.F + r.I + r.Q,
          0
        );

        if (total === 0) {
          return {
            year: year.year,
            A: 0,
            B: 0,
            C: 0,
            D: 0,
            F: 0,
            I: 0,
            Q: 0,
          };
        }

        return {
          year: year.year,
          A: yearData.reduce((sum, r) => sum + r.A, 0) / total,
          B: yearData.reduce((sum, r) => sum + r.B, 0) / total,
          C: yearData.reduce((sum, r) => sum + r.C, 0) / total,
          D: yearData.reduce((sum, r) => sum + r.D, 0) / total,
          F: yearData.reduce((sum, r) => sum + r.F, 0) / total,
          I: yearData.reduce((sum, r) => sum + r.I, 0) / total,
          Q: yearData.reduce((sum, r) => sum + r.Q, 0) / total,
        };
      });
      profDistributions[prof] = profData;
    });
    setProfessorGradeDistributions(profDistributions);
  }, [rawData, yearRange, selectedProfessors]);

  // ---------- MISC HANDLERS ----------
  function toggleGroup(groupKey) {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }

  function toggleProfessor(profName) {
    if (selectedProfessors.includes(profName)) {
      setSelectedProfessors(selectedProfessors.filter((p) => p !== profName));
    } else {
      setSelectedProfessors([...selectedProfessors, profName]);
    }
  }

  // ---------- BOOKMARKS ----------
  function handleBookmark() {
    if (!dept || !course) return;
    const found = bookmarks.find((b) => b.dept === dept && b.course === course);
    if (!found) {
      setBookmarks([...bookmarks, { dept, course }]);
    } else {
      alert("This class is already bookmarked!");
    }
  }

  function loadBookmark(bm) {
    setDept(bm.dept);
    setCourse(bm.course);
    setShowBookmarks(false);
    fetchData(bm.dept, bm.course);
  }

  // ---------- RESET ALL ----------
  function resetPage() {
    setDept("");
    setCourse("");
    setRawData([]);
    setChartData([]);
    setTableData([]);
    setProfessorData([]);
    setBestProfessor(null);
    setGradeDistribution([]);
    setGroupedData({});
    setStackedData([]);
    setSelectedProfessors([]);
    setExpandedGroups({});
    setLoading(false);
    setOnlyFive(false);
    setShowBookmarks(false);
    setYearRange("all"); // Reset to 'all' when clearing
  }

  // ---------- RENDER ----------
  return (
    <>
      <Analytics />

      {/* Top Nav */}
      <nav className={`navbar navbar-expand-lg ${styles["navbar-custom"]}`}>
        <div className="container-fluid">
          <div className={styles["navbar-center"]}>
            <span
              className={`navbar-brand mb-0 h1 ${styles["navbar-brand-custom"]} ${styles["heading"]}`}
              onClick={resetPage}
            >
              Better Anex
            </span>
            <div className={`${styles["navbar-subtitle"]} ${styles["text"]}`}>
              <span>
                <span className={styles["navbar-link"]}>Developed by Alyan Tharani</span>{" "}
              </span>
              <span className={styles["navbar-divider"]}>|</span>
              <a
                href="https://alyantharani.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles["navbar-link"]}
              >
                alyantharani.com
              </a>
            </div>
          </div>
          <div className={styles["navbar-right"]}>
            <button
              className={`btn btn-outline-light ${styles["button-text"]}`}
              onClick={() => setShowBookmarks(!showBookmarks)}
            >
              {showBookmarks ? "Hide Bookmarks" : "Bookmarks"}
            </button>
          </div>
        </div>
      </nav>

      {/* Bookmarks Panel */}
      {showBookmarks && (
        <div className={styles["bookmark-panel"]}>
          <h3>Bookmarked Classes</h3>
          {bookmarks.length === 0 && <p>No bookmarks yet.</p>}
          {bookmarks.map((bm, idx) => (
            <div
              key={idx}
              className={styles["bookmark-item"]}
              onClick={() => loadBookmark(bm)}
            >
              <span>
                {bm.dept} {bm.course}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBookmarks(
                    bookmarks.filter((b) => !(b.dept === bm.dept && b.course === bm.course))
                  );
                }}
                className={styles["bookmark-delete"]}
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Container */}
      <div className={`container ${styles["main-container"]}`}>
        {/* Form Row */}
        <div className="row mb-3">
          <div className="col-md-3 col-sm-6 mb-2">
            <input
              type="text"
              placeholder="Department (e.g. CSCE)"
              value={dept}
              onChange={(e) => setDept(e.target.value.toUpperCase())}
              className={`${styles["input-box"]} w-100`}
            />
          </div>
          <div className="col-md-3 col-sm-6 mb-2">
            <input
              type="text"
              placeholder="Course (e.g. 121)"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className={`${styles["input-box"]} w-100`}
            />
          </div>
          <div className="col-md-3 col-sm-6 mb-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                fetchData();
              }}
              className="btn btn-primary w-100"
            >
              Submit
            </button>
          </div>
          <div className="col-md-3 col-sm-6 mb-2">
            <button
              type="button"
              onClick={handleBookmark}
              className="btn btn-secondary w-100"
            >
              Bookmark This Class
            </button>
          </div>
        </div>

        {/* Loading Animation - Only show when actively loading */}
        {loading && (
          <div className={styles["loading-container"]}>
            <div className={styles["loading-spinner"]}>
              <div className={styles["loading-dot"]}></div>
              <div className={styles["loading-dot"]}></div>
              <div className={styles["loading-dot"]}></div>
              <div className={styles["loading-dot"]}></div>
              <div className={styles["loading-dot"]}></div>
              <div className={styles["loading-dot"]}></div>
              <div className={styles["loading-dot"]}></div>
              <div className={styles["loading-dot"]}></div>
            </div>
          </div>
        )}

        {/* Only render content if we have data and not loading */}
        {!loading && rawData.length > 0 && (
          <>
            {/* GPA Over the Years */}
            {chartData.length > 0 && (
              <div className={styles["chart-wrapper"]}>
                <h2 className="text-center">📈 GPA Over the Years</h2>
                <div className={styles["line-chart-container"]}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="yearSemester"
                        angle={-30}
                        textAnchor="end"
                        interval="preserveStartEnd"
                        minTickGap={20}
                      />
                      <YAxis
                        domain={[
                          (dataMin) => Math.floor(dataMin * 2) / 2,
                          4.0,
                        ]}
                        tickFormatter={(val) => val.toFixed(2)}
                        ticks={(() => {
                          // Calculate minimum GPA from all professor data
                          const minGPA = Math.min(
                            ...chartData.flatMap((row) =>
                              Object.entries(row)
                                .filter(([key]) => key !== "yearSemester")
                                .map(([_, value]) => value)
                                .filter((val) => val !== null)
                            )
                          );
                          const startValue = Math.floor(minGPA * 2) / 2;
                          return Array.from(
                            { length: Math.floor((4.0 - startValue) / 0.5) + 1 },
                            (_, i) => startValue + i * 0.5
                          );
                        })()}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                        labelStyle={{ color: "#4a90e2", fontWeight: 600 }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(value, name) => {
                          if (value === null) return ["No data", name];
                          return [`${value.toFixed(3)}`, name];
                        }}
                      />
                      {professorData
                        .filter((p) => selectedProfessors.includes(p.professor))
                        .map((p) => (
                          <Line
                            key={p.professor}
                            type="monotone"
                            dataKey={p.professor}
                            stroke={p.color}
                            strokeWidth={2}
                            dot
                            activeDot={{ r: 6 }}
                            connectNulls={true}
                            isAnimationActive={false}
                          />
                        ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Main content row */}
            <div className="row mt-4">
              {/* Professor section (70%) */}
              <div className={styles["professor-section"]}>
                <div className={styles["professor-controls"]}>
                  <div className={styles["year-range-selector"]}>
                    <button
                      onClick={() => setYearRange("all")}
                      className={yearRange === "all" ? styles["active-year-button"] : ""}
                    >
                      All Time
                    </button>
                    <button
                      onClick={() => setYearRange("2")}
                      className={yearRange === "2" ? styles["active-year-button"] : ""}
                    >
                      2 Years
                    </button>
                    <button
                      onClick={() => setYearRange("3")}
                      className={yearRange === "3" ? styles["active-year-button"] : ""}
                    >
                      3 Years
                    </button>
                    <button
                      onClick={() => setYearRange("5")}
                      className={yearRange === "5" ? styles["active-year-button"] : ""}
                    >
                      5 Years
                    </button>
                  </div>
                  <button onClick={() => setSelectedProfessors(professorData.map((p) => p.professor))}>
                    Select All
                  </button>
                  <button onClick={() => setSelectedProfessors([])}>
                    Unselect All
                  </button>
                </div>
                <div className={styles["professor-list-container"]}>
                  <div className={styles["professor-list-header"]}>
                    <h3>Professor Selection</h3>
                  </div>
                  <div className={styles["professor-list-content"]}>
                    <div className="row">
                      {professorData.map((p) => {
                        const isSelected = selectedProfessors.includes(p.professor);
                        return (
                          <div className="col-6 mb-2" key={p.professor}>
                            <button
                              onClick={() => toggleProfessor(p.professor)}
                              className={styles["professor-button"]}
                              style={{
                                borderLeft: `8px solid ${p.color}`,
                                backgroundColor: isSelected ? "#4a90e2" : "#222",
                              }}
                            >
                              {p.professor}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats section (30%) */}
              <div className={styles["stats-section"]}>
                {/* Best Professor */}
                {bestProfessor && (
                  <div className="mb-3">
                    <div className={styles["content-card"]}>
                      <div className={styles["best-prof-content"]}>
                        <h2 className={styles["best-prof-title"]}>🏆 Best Professor</h2>
                        <p>{bestProfessor.professor}</p>
                        <p>Avg GPA: {bestProfessor.avgGpa.toFixed(2)}</p>
                        <p style={{ fontStyle: "italic" }}>
                          {yearRange === "all" ? "(All Time)" : `(Last ${yearRange} Years)`}
                        </p>
                        <div className="mt-3">
                          <h3>Rate My Professor</h3>
                          <a
                            href="https://www.ratemyprofessors.com/search/professors/1003"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles["website-link"]}
                          >
                            A&M Professors
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Donut Chart */}
                {gradeDistribution.length > 0 && (
                  <div className={styles["content-card"]}>
                    <h2>Grade Distribution</h2>
                    <div className={styles["pie-chart-container"]}>
                      <PieChart width={240} height={240}>
                        <Pie
                          data={gradeDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          label={({ name, value }) => {
                            // Recompute percentage for the label
                            const total = gradeDistribution.reduce((acc, slice) => acc + slice.value, 0);
                            if (total === 0) return `${name}: 0%`;
                            const percent = (value / total) * 100;
                            return `${name}: ${percent.toFixed(0)}%`;
                          }}
                        >
                          {gradeDistribution.map((entry) => (
                            <Cell
                              key={`cell-${entry.name}`}
                              fill={gradeColors[entry.name] || "#8884d8"}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1a1a1a",
                            border: "1px solid #333",
                            borderRadius: "4px",
                            color: "#fff",
                          }}
                          labelStyle={{ color: "#fff" }}
                          formatter={(value, name) => {
                            // Compute percentage for the tooltip
                            const total = gradeDistribution.reduce((acc, slice) => acc + slice.value, 0);
                            if (total === 0) return ["0%", name];
                            const percent = (value / total) * 100;
                            return [`${percent.toFixed(1)}%`, name];
                          }}
                        />
                      </PieChart>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stacked Grade Chart */}
            {stackedData.length > 0 && (
              <div className={`mt-4 ${styles["chart-wrapper"]}`}>
                <div className={styles["chart-header"]}>
                  <h2 className="text-center">
                    Letter Grade Distribution{" "}
                    {yearRange === "all" ? "All Time" : `Last ${yearRange} Years`}
                  </h2>
                  <div className={styles["view-toggle"]}>
                    <button
                      onClick={() => setGradeDistView("combined")}
                      className={gradeDistView === "combined" ? styles["active-view-button"] : ""}
                    >
                      Combined View
                    </button>
                    <button
                      onClick={() => setGradeDistView("individual")}
                      className={gradeDistView === "individual" ? styles["active-view-button"] : ""}
                    >
                      Individual Professors
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: gradeDistView === "combined" ? "300px" : "auto",
                  }}
                >
                  <ResponsiveContainer
                    width="100%"
                    height={gradeDistView === "combined" ? "100%" : "300px"}
                  >
                    {gradeDistView === "combined" ? (
                      <BarChart data={stackedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="year" stroke="#fff" />
                        <YAxis
                          domain={[0, 1]}
                          tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                          stroke="#fff"
                        />
                        <Tooltip
                          formatter={(value) => `${(value * 100).toFixed(1)}%`}
                          contentStyle={{
                            backgroundColor: "#1a1a1a",
                            border: "1px solid #333",
                            borderRadius: "4px",
                            color: "#fff",
                          }}
                          labelStyle={{ color: "#fff" }}
                        />
                        <Legend wrapperStyle={{ color: "#fff" }} />
                        <ReferenceLine y={0} stroke="#333" />
                        <Bar dataKey="A" stackId="grades" fill={gradeColors.A} />
                        <Bar dataKey="B" stackId="grades" fill={gradeColors.B} />
                        <Bar dataKey="C" stackId="grades" fill={gradeColors.C} />
                        <Bar dataKey="D" stackId="grades" fill={gradeColors.D} />
                        <Bar dataKey="F" stackId="grades" fill={gradeColors.F} />
                        <Bar dataKey="I" stackId="grades" fill={gradeColors.I} />
                        <Bar dataKey="Q" stackId="grades" fill={gradeColors.Q} />
                      </BarChart>
                    ) : (
                      <div className={styles["professor-chart-container"]}>
                        {selectedProfessors.length > 0 ? (
                          selectedProfessors
                            .filter((prof) => {
                              const profData = professorGradeDistributions[prof] || [];
                              return profData.some(
                                (year) =>
                                  year.A > 0 ||
                                  year.B > 0 ||
                                  year.C > 0 ||
                                  year.D > 0 ||
                                  year.F > 0 ||
                                  year.I > 0 ||
                                  year.Q > 0
                              );
                            })
                            .map((prof) => (
                              <div key={prof} className={styles["professor-chart"]}>
                                <h3>{prof}</h3>
                                <div style={{ flex: 1, minHeight: 0 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={professorGradeDistributions[prof] || []}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                      <XAxis
                                        dataKey="year"
                                        stroke="#fff"
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                        interval="preserveStartEnd"
                                      />
                                      <YAxis
                                        domain={[0, 1]}
                                        tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                                        stroke="#fff"
                                        width={60}
                                      />
                                      <Tooltip
                                        formatter={(value) => `${(value * 100).toFixed(1)}%`}
                                        contentStyle={{
                                          backgroundColor: "#1a1a1a",
                                          border: "1px solid #333",
                                          borderRadius: "4px",
                                          color: "#fff",
                                        }}
                                        labelStyle={{ color: "#fff" }}
                                      />
                                      <Legend
                                        wrapperStyle={{ color: "#fff" }}
                                        verticalAlign="top"
                                        height={36}
                                      />
                                      <ReferenceLine y={0} stroke="#333" />
                                      <Bar dataKey="A" stackId="grades" fill={gradeColors.A} />
                                      <Bar dataKey="B" stackId="grades" fill={gradeColors.B} />
                                      <Bar dataKey="C" stackId="grades" fill={gradeColors.C} />
                                      <Bar dataKey="D" stackId="grades" fill={gradeColors.D} />
                                      <Bar dataKey="F" stackId="grades" fill={gradeColors.F} />
                                      <Bar dataKey="I" stackId="grades" fill={gradeColors.I} />
                                      <Bar dataKey="Q" stackId="grades" fill={gradeColors.Q} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div
                            style={{
                              textAlign: "center",
                              color: "#fff",
                              padding: "2rem",
                            }}
                          >
                            Please select at least one professor to view individual grade
                            distributions
                          </div>
                        )}
                      </div>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Collapsible Grade Distribution Table */}
            {Object.keys(groupedData).length > 0 && (
              <div className={`mt-4 text-center ${styles["data-table-container"]}`}>
                <h2 style={{ marginBottom: 15 }}>📊 Grade Distribution</h2>
                <div className="table-responsive">
                  <table className={`${styles["data-table"]} m-auto`}>
                    <thead>
                      <tr>
                        <th className={styles["table-header"]}>Group</th>
                        <th className={styles["table-header"]}>Overall GPA</th>
                        <th className={styles["table-header"]}>Section</th>
                        <th className={styles["table-header"]}>A</th>
                        <th className={styles["table-header"]}>B</th>
                        <th className={styles["table-header"]}>C</th>
                        <th className={styles["table-header"]}>D</th>
                        <th className={styles["table-header"]}>F</th>
                        <th className={styles["table-header"]}>I</th>
                        <th className={styles["table-header"]}>Q</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(groupedData)
                        .sort((a, b) => {
                          const [yearA, semA] = a.split("-");
                          const [yearB, semB] = b.split("-");
                          const yA = parseInt(yearA, 10);
                          const yB = parseInt(yearB, 10);
                          if (yB !== yA) return yB - yA;
                          return semesterOrder[semB] - semesterOrder[semA];
                        })
                        .map((key) => {
                          const [year, sem, prof] = key.split("-");
                          const rows = groupedData[key];
                          const isExpanded = expandedGroups[key] || false;

                          // Calculate group GPA
                          let totalWeightedGPA = 0;
                          let totalStudents = 0;

                          rows.forEach((r) => {
                            const stCount = r.A + r.B + r.C + r.D + r.F + r.I + r.Q;
                            if (!isNaN(r.gpa) && stCount > 0) {
                              totalWeightedGPA += r.gpa * stCount;
                              totalStudents += stCount;
                            }
                          });

                          const groupGPA =
                            totalStudents > 0 ? (totalWeightedGPA / totalStudents).toFixed(2) : null;

                          // If there's no valid GPA, skip
                          if (groupGPA === null) return null;

                          // Letter grade totals for the group row
                          const totalStudentsGroup = rows.reduce(
                            (sum, r) => sum + r.A + r.B + r.C + r.D + r.F + r.I + r.Q,
                            0
                          );
                          const totalA = rows.reduce((sum, r) => sum + r.A, 0);
                          const totalB = rows.reduce((sum, r) => sum + r.B, 0);
                          const totalC = rows.reduce((sum, r) => sum + r.C, 0);
                          const totalD = rows.reduce((sum, r) => sum + r.D, 0);
                          const totalF = rows.reduce((sum, r) => sum + r.F, 0);
                          const totalI = rows.reduce((sum, r) => sum + r.I, 0);
                          const totalQ = rows.reduce((sum, r) => sum + r.Q, 0);

                          return (
                            <React.Fragment key={key}>
                              {/* Group Row */}
                              <tr
                                onClick={() => toggleGroup(key)}
                                style={{ cursor: "pointer", backgroundColor: "#2a2a2a" }}
                              >
                                <td className={styles["table-cell"]}>
                                  {`${year} ${sem} - ${prof}`} {isExpanded ? "▼" : "▶"}
                                </td>
                                {/* Overall GPA in second column */}
                                <td className={styles["table-cell"]}>{groupGPA}</td>
                                {/* Section column is blank for group row */}
                                <td className={styles["table-cell"]}></td>

                                {/* Totals for A, B, C, D, F, I, Q */}
                                <td className={styles["table-cell"]}>
                                  {`${totalA} (${((totalA / totalStudentsGroup) * 100).toFixed(1)}%)`}
                                </td>
                                <td className={styles["table-cell"]}>
                                  {`${totalB} (${((totalB / totalStudentsGroup) * 100).toFixed(1)}%)`}
                                </td>
                                <td className={styles["table-cell"]}>
                                  {`${totalC} (${((totalC / totalStudentsGroup) * 100).toFixed(1)}%)`}
                                </td>
                                <td className={styles["table-cell"]}>
                                  {`${totalD} (${((totalD / totalStudentsGroup) * 100).toFixed(1)}%)`}
                                </td>
                                <td className={styles["table-cell"]}>
                                  {`${totalF} (${((totalF / totalStudentsGroup) * 100).toFixed(1)}%)`}
                                </td>
                                <td className={styles["table-cell"]}>
                                  {`${totalI} (${((totalI / totalStudentsGroup) * 100).toFixed(1)}%)`}
                                </td>
                                <td className={styles["table-cell"]}>
                                  {`${totalQ} (${((totalQ / totalStudentsGroup) * 100).toFixed(1)}%)`}
                                </td>
                              </tr>

                              {/* Expanded Rows */}
                              {isExpanded
                                ? rows.map((child, idx) => {
                                    const sectionTotal =
                                      child.A +
                                      child.B +
                                      child.C +
                                      child.D +
                                      child.F +
                                      child.I +
                                      child.Q;
                                    // Only show expanded rows with valid GPA
                                    if (isNaN(child.gpa) || sectionTotal === 0) return null;

                                    return (
                                      <tr key={idx} style={{ backgroundColor: "#1e1e1e" }}>
                                        {/* Blank cell under Group */}
                                        <td className={styles["table-cell"]}></td>
                                        {/* GPA in second column */}
                                        <td className={styles["table-cell"]}>
                                          {child.gpa.toFixed(2)}
                                        </td>
                                        {/* Section in third column */}
                                        <td className={styles["table-cell"]}>
                                          {child.section}
                                        </td>
                                        {/* Grades */}
                                        <td className={styles["table-cell"]}>{child.A}</td>
                                        <td className={styles["table-cell"]}>{child.B}</td>
                                        <td className={styles["table-cell"]}>{child.C}</td>
                                        <td className={styles["table-cell"]}>{child.D}</td>
                                        <td className={styles["table-cell"]}>{child.F}</td>
                                        <td className={styles["table-cell"]}>{child.I}</td>
                                        <td className={styles["table-cell"]}>{child.Q}</td>
                                      </tr>
                                    );
                                  })
                                : null}
                            </React.Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
