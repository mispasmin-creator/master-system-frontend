"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, Upload, X, Search, History, ArrowLeft, Filter, Sparkles, FileText, AlertCircle, User, Calendar, ChevronRight } from "lucide-react"
import { API_URL, getToken, getStoredUser } from "@/lib/auth"

const CONFIG = {
  SOURCE_SHEET_NAME: "DELEGATION",
  TARGET_SHEET_NAME: "DELEGATION DONE",
  PAGE_CONFIG: {
    title: "DELEGATION Tasks",
    historyTitle: "DELEGATION Task History",
    description: "Showing today, tomorrow's tasks and past due tasks",
    historyDescription: "Read-only view of completed tasks with submission history",
  },
}

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

function DelegationDataPage() {
  const [accountData, setAccountData] = useState([])
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [additionalData, setAdditionalData] = useState({})
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [remarksData, setRemarksData] = useState({})
  const [historyData, setHistoryData] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [statusData, setStatusData] = useState({})
  const [nextTargetDate, setNextTargetDate] = useState({})
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")
  const [filterGivenBy, setFilterGivenBy] = useState("")
  const [filterName, setFilterName] = useState("")

  useEffect(() => {
    const stored = getStoredUser()
    const role = stored?.role || sessionStorage.getItem("role") || "admin"
    const user = stored?.username || sessionStorage.getItem("username") || ""
    setUserRole(role)
    setUsername(user)
  }, [])

  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const formatDateToDDMMYYYY = useCallback((date) => {
    if (!date) return ""
    const d = new Date(date)
    if (isNaN(d.getTime())) return ""
    const day = d.getDate().toString().padStart(2, "0")
    const month = (d.getMonth() + 1).toString().padStart(2, "0")
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }, [])

  const parseGoogleSheetsDate = useCallback((dateStr) => {
    if (!dateStr) return ""

    // If it's already in DD/MM/YYYY format, return as is
    if (typeof dateStr === "string" && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const parts = dateStr.split("/")
      if (parts.length === 3) {
        const day = parts[0].padStart(2, "0")
        const month = parts[1].padStart(2, "0")
        const year = parts[2]
        return `${day}/${month}/${year}`
      }
      return dateStr
    }

    // Handle Google Sheets Date() format
    if (typeof dateStr === "string" && dateStr.startsWith("Date(")) {
      const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr)
      if (match) {
        const year = Number.parseInt(match[1], 10)
        const month = Number.parseInt(match[2], 10)
        const day = Number.parseInt(match[3], 10)
        return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
      }
    }

    // Handle other date formats
    try {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return formatDateToDDMMYYYY(date)
      }
    } catch (error) {
      console.error("Error parsing date:", error)
    }

    // If all else fails, return the original string
    return dateStr
  }, [formatDateToDDMMYYYY])

  const formatDateForDisplay = useCallback(
    (dateStr) => {
      if (!dateStr) return "—"

      // If it's already in proper DD/MM/YYYY format, return as is
      if (typeof dateStr === "string" && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        return dateStr
      }

      // Try to parse and reformat
      return parseGoogleSheetsDate(dateStr) || "—"
    },
    [parseGoogleSheetsDate],
  )

  const parseDateFromDDMMYYYY = useCallback((dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null
    const parts = dateStr.split("/")
    if (parts.length !== 3) return null
    return new Date(parts[2], parts[1] - 1, parts[0])
  }, [])

  const sortDateWise = useCallback(
    (a, b) => {
      const dateStrA = a["col6"] || ""
      const dateStrB = b["col6"] || ""
      const dateA = parseDateFromDDMMYYYY(dateStrA)
      const dateB = parseDateFromDDMMYYYY(dateStrB)
      if (!dateA) return 1
      if (!dateB) return -1
      return dateA.getTime() - dateB.getTime()
    },
    [parseDateFromDDMMYYYY],
  )

  const resetFilters = useCallback(() => {
    setSearchTerm("")
    setStartDate("")
    setEndDate("")
    setFilterGivenBy("")
    setFilterName("")
  }, [])

  const givenByOptions = useMemo(() =>
    [...new Set(accountData.map(t => t["col3"]).filter(Boolean))].sort()
  , [accountData])

  const nameOptions = useMemo(() =>
    [...new Set(accountData.map(t => t["col4"]).filter(Boolean))].sort()
  , [accountData])

  // Get color based on data from column R
  const getRowColor = useCallback((colorCode) => {
    if (!colorCode) return "bg-white"

    const code = colorCode.toString().toLowerCase()
    switch (code) {
      case "red":
        return "bg-red-50 border-l-4 border-red-400"
      case "yellow":
        return "bg-yellow-50 border-l-4 border-yellow-400"
      case "green":
        return "bg-green-50 border-l-4 border-green-400"
      case "blue":
        return "bg-blue-50 border-l-4 border-blue-400"
      default:
        return "bg-white"
    }
  }, [])

  // Optimized filtered data with debounced search
  const filteredAccountData = useMemo(() => {
    const filtered = accountData.filter((account) => {
      const matchSearch = debouncedSearchTerm
        ? Object.values(account).some(v => v && v.toString().toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
        : true
      const matchGivenBy = filterGivenBy ? account["col3"] === filterGivenBy : true
      const matchName = filterName ? account["col4"] === filterName : true
      return matchSearch && matchGivenBy && matchName
    })
    return filtered.sort(sortDateWise)
  }, [accountData, debouncedSearchTerm, sortDateWise, filterGivenBy, filterName])

  // Updated history filtering with user filter based on column H
  const filteredHistoryData = useMemo(() => {
    return historyData
      .filter((item) => {
        // User filter: For non-admin users, check column H (col7) matches username
        const userMatch = userRole === "admin" ||
          (item["col7"] && item["col7"].toLowerCase() === username.toLowerCase())

        if (!userMatch) return false

        const matchesSearch = debouncedSearchTerm
          ? Object.values(item).some(
            (value) => value && value.toString().toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
          )
          : true

        let matchesDateRange = true
        if (startDate || endDate) {
          const itemDate = parseDateFromDDMMYYYY(item["col0"])
          if (!itemDate) return false

          if (startDate) {
            const startDateObj = new Date(startDate)
            startDateObj.setHours(0, 0, 0, 0)
            if (itemDate < startDateObj) matchesDateRange = false
          }

          if (endDate) {
            const endDateObj = new Date(endDate)
            endDateObj.setHours(23, 59, 59, 999)
            if (itemDate > endDateObj) matchesDateRange = false
          }
        }

        return matchesSearch && matchesDateRange
      })
      .sort((a, b) => {
        const dateStrA = a["col0"] || ""
        const dateStrB = b["col0"] || ""
        const dateA = parseDateFromDDMMYYYY(dateStrA)
        const dateB = parseDateFromDDMMYYYY(dateStrB)
        if (!dateA) return 1
        if (!dateB) return -1
        return dateB.getTime() - dateA.getTime()
      })
  }, [historyData, debouncedSearchTerm, startDate, endDate, parseDateFromDDMMYYYY, userRole, username])

  // Optimized data fetching with parallel requests
  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/checklist/task`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      
      if (!response.ok) throw new Error("Failed to load tasks");
      const result = await response.json();
      
      const tasks = result.data || [];
      const delegationTasks = tasks.filter(t => t.taskType === 'delegation' && t.status !== 'Completed' && t.status !== 'Verified');
      const historyTasks = tasks.filter(t => t.taskType === 'delegation' && (t.status === 'Completed' || t.status === 'Verified'));
      
      const stored = getStoredUser();
      const currentUsername = stored?.username || sessionStorage.getItem("username") || "";
      const currentUserRole = (stored?.role || sessionStorage.getItem("role") || "admin").toLowerCase();
      
      const mapTask = (t) => {
        return {
          _id: t.id,
          _taskId: t.id,
          col0: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : "",
          col1: t.id,
          col2: t.department ? t.department.name : (t.firmName || "DELEGATION"),
          col3: t.givenBy || "",
          col4: t.assignedTo || "Unassigned",
          col5: t.description || "",
          col6: t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-GB') : "",
          col7: t.assignedTo || "",
          col8: t.description || "",
          col9: t.frequency || "",
          col10: t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-GB') : "",
          col11: t.completedAt ? new Date(t.completedAt).toLocaleDateString('en-GB') : "",
          col14: t.attachmentUrl || "",
        };
      };
      
      const mappedTasks = delegationTasks.map(mapTask).filter(t => 
        currentUserRole === 'admin' || !currentUsername || (t.col4 && t.col4.toLowerCase() === currentUsername.toLowerCase())
      );
      
      setAccountData(mappedTasks);
      setHistoryData(historyTasks.map(mapTask));
      
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [])

  useEffect(() => {
    fetchSheetData()
  }, [fetchSheetData])

  // Send overdue alert once per day when admin opens the page
  useEffect(() => {
    if (accountData.length === 0 || userRole !== "admin") return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdueTasks = accountData.filter((task) => {
      const plannedDate = parseDateFromDDMMYYYY(task["col10"])
      if (!plannedDate) return false
      plannedDate.setHours(0, 0, 0, 0)
      return plannedDate < today
    })

    console.log("sendOverdueAlert", overdueTasks)
  }, [accountData, userRole, parseDateFromDDMMYYYY])

  const handleSelectItem = useCallback((id, isChecked) => {
    setSelectedItems((prev) => {
      const newSelected = new Set(prev)

      if (isChecked) {
        newSelected.add(id)
        setStatusData((prevStatus) => ({ ...prevStatus, [id]: "Done" }))
      } else {
        newSelected.delete(id)
        setAdditionalData((prevData) => {
          const newAdditionalData = { ...prevData }
          delete newAdditionalData[id]
          return newAdditionalData
        })
        setRemarksData((prevRemarks) => {
          const newRemarksData = { ...prevRemarks }
          delete newRemarksData[id]
          return newRemarksData
        })
        setStatusData((prevStatus) => {
          const newStatusData = { ...prevStatus }
          delete newStatusData[id]
          return newStatusData
        })
        setNextTargetDate((prevDate) => {
          const newDateData = { ...prevDate }
          delete newDateData[id]
          return newDateData
        })
      }

      return newSelected
    })
  }, [])

  const handleCheckboxClick = useCallback(
    (e, id) => {
      e.stopPropagation()
      const isChecked = e.target.checked
      handleSelectItem(id, isChecked)
    },
    [handleSelectItem],
  )

  const handleSelectAllItems = useCallback(
    (e) => {
      e.stopPropagation()
      const checked = e.target.checked

      if (checked) {
        const allIds = filteredAccountData.map((item) => item._id)
        setSelectedItems(new Set(allIds))

        const newStatusData = {}
        allIds.forEach((id) => {
          newStatusData[id] = "Done"
        })
        setStatusData((prev) => ({ ...prev, ...newStatusData }))
      } else {
        setSelectedItems(new Set())
        setAdditionalData({})
        setRemarksData({})
        setStatusData({})
        setNextTargetDate({})
      }
    },
    [filteredAccountData],
  )

  const handleImageUpload = useCallback(async (id, e) => {
    const file = e.target.files[0]
    if (!file) return

    setAccountData((prev) => prev.map((item) => (item._id === id ? { ...item, image: file } : item)))
  }, [])

  const handleStatusChange = useCallback((id, value) => {
    setStatusData((prev) => ({ ...prev, [id]: value }))
    if (value === "Done") {
      setNextTargetDate((prev) => {
        const newDates = { ...prev }
        delete newDates[id]
        return newDates
      })
    }
  }, [])

  const handleNextTargetDateChange = useCallback((id, value) => {
    setNextTargetDate((prev) => ({ ...prev, [id]: value }))
  }, [])

  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }, [])

  const toggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev)
    resetFilters()
  }, [resetFilters])

  const handleSubmit = async () => {
    if (selectedItems.size === 0) return;
    
    setIsSubmitting(true);
    const selectedItemsArray = Array.from(selectedItems);
    let successCount = 0;
    
    try {
      const stored = getStoredUser();
      const curUser = stored?.username || sessionStorage.getItem("username") || "Unknown";
      
      for (const id of selectedItemsArray) {
        const item = accountData.find(a => a._id === id);
        if (!item) continue;
        
        let attachmentUrl = "";
        
        // Handle file upload if present
        if (item.image instanceof File) {
          const fd = new FormData();
          fd.append("file", item.image);
          const uploadRes = await fetch(`${API_URL}/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getToken()}` },
            body: fd
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success) attachmentUrl = uploadData.data.url;
        }
        
        // Complete Task
        const res = await fetch(`${API_URL}/checklist/task/${item._taskId}/complete`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify({
            status: statusData[id] === "Done" ? "Completed" : "Pending",
            remarks: remarksData[id] || "",
            attachmentUrl,
            completedBy: curUser
          })
        });
        
        if (res.ok) successCount++;
      }
      
      if (successCount > 0) {
        setSuccessMessage(`Successfully completed ${successCount} tasks.`);
        setTimeout(() => setSuccessMessage(""), 5000);
        setSelectedItems(new Set());
        fetchSheetData();
      }
    } catch (error) {
      console.error(error);
      alert("Error submitting tasks");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedItemsCount = selectedItems.size

  return (
    <div className="dashboard-container">
      <div className="max-w-7xl mx-auto pb-8 space-y-8">
        {/* Enhanced Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                {showHistory ? CONFIG.PAGE_CONFIG.historyTitle : CONFIG.PAGE_CONFIG.title}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {showHistory ? CONFIG.PAGE_CONFIG.historyDescription : CONFIG.PAGE_CONFIG.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* History Toggle */}
            <button
              onClick={toggleHistory}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl py-3 px-5 border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all shadow-sm"
            >
              {showHistory ? (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  <span>Pending Tasks</span>
                </>
              ) : (
                <>
                  <History className="h-4 w-4" />
                  <span>Task History</span>
                </>
              )}
            </button>

            {/* Submit Actions */}
            {!showHistory && (
              <button
                onClick={handleSubmit}
                disabled={selectedItemsCount === 0 || isSubmitting}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-white font-semibold transition-all duration-300 shadow-md hover:shadow-lg ${selectedItemsCount === 0 || isSubmitting
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  }`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                <span>{isSubmitting ? "Processing..." : `Submit (${selectedItemsCount})`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="rounded-2xl border border-slate-200 shadow-lg bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700 font-semibold mr-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <span>Filters</span>
            </div>
            
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={showHistory ? "Search in history..." : "Quick search pending tasks..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {!showHistory && (
              <>
                <select
                  value={filterGivenBy}
                  onChange={(e) => setFilterGivenBy(e.target.value)}
                  className="min-w-[140px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                >
                  <option value="">All Given By</option>
                  {givenByOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>

                <select
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="min-w-[140px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                >
                  <option value="">All Names</option>
                  {nameOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>

                {(filterGivenBy || filterName || searchTerm) && (
                  <button onClick={resetFilters}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-100">
                    Clear Filters
                  </button>
                )}
              </>
            )}

            {showHistory && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                  />
                </div>
                <span className="text-slate-400">to</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                  />
                </div>
                {(startDate || endDate || searchTerm) && (
                  <button
                    onClick={resetFilters}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all border border-red-100"
                  >
                    Clear All
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
              {successMessage}
            </div>
            <button onClick={() => setSuccessMessage("")} className="text-green-500 hover:text-green-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 leading-none">
                  {showHistory ? "Historical Submission Log" : "Active Processing Queue"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {showHistory 
                    ? `Reviewing archived records for ${CONFIG.SOURCE_SHEET_NAME}` 
                    : `Currently tracking ${filteredAccountData.length} pending items`}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-purple-600">Loading task data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800 text-center">
              {error}{" "}
              <button className="underline ml-2" onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          ) : showHistory ? (
            <>
              {/* Simplified History Filters - Only Date Range */}
              <div className="p-4 border-b border-purple-100 bg-gray-50">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <div className="mb-2 flex items-center">
                      <span className="text-sm font-medium text-purple-700">Filter by Date Range:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <label htmlFor="start-date" className="text-sm text-gray-700 mr-1">
                          From
                        </label>
                        <input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="text-sm border border-gray-200 rounded-md p-1"
                        />
                      </div>
                      <div className="flex items-center">
                        <label htmlFor="end-date" className="text-sm text-gray-700 mr-1">
                          To
                        </label>
                        <input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="text-sm border border-gray-200 rounded-md p-1"
                        />
                      </div>
                    </div>
                  </div>

                  {(startDate || endDate || searchTerm) && (
                    <button
                      onClick={resetFilters}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>

              {/* History Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Next Target Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remarks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Uploaded Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task Description
                      </th>
                      {userRole === "admin" && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHistoryData.length > 0 ? (
                      filteredHistoryData.map((history) => (
                        <tr key={history._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{history["col0"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{history["col1"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${history["col2"] === "Done"
                                  ? "bg-green-100 text-green-800"
                                  : history["col2"] === "Extend date"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                            >
                              {history["col2"] || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{history["col3"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs" title={history["col4"]}>
                              {history["col4"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {history["col5"] ? (
                              <a
                                href={history["col5"]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline flex items-center"
                              >
                                <img
                                  src={history["col5"] || "/api/placeholder/32/32"}
                                  alt="Attachment"
                                  className="h-8 w-8 object-cover rounded-md mr-2"
                                />
                                View
                              </a>
                            ) : (
                              <span className="text-gray-400">No attachment</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate" title={history["col8"]}>
                              {history["col8"] || "—"}
                            </div>
                          </td>
                          {userRole === "admin" && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{history["col7"] || "—"}</div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={userRole === "admin" ? 8 : 7} className="px-6 py-4 text-center text-gray-500">
                          {searchTerm || startDate || endDate
                            ? "No historical records matching your filters"
                            : "No completed records found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Regular Tasks Table */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        checked={filteredAccountData.length > 0 && selectedItems.size === filteredAccountData.length}
                        onChange={handleSelectAllItems}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Given By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task Description
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!accountData["col17"] ? "bg-yellow-50" : ""}`}
                    >
                      Task Start Date
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!accountData["col17"] ? "bg-green-50" : ""}`}
                    >
                      Planned Date
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!accountData["col17"] ? "bg-blue-50" : ""}`}
                    >
                      Status
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!accountData["col17"] ? "bg-indigo-50" : ""}`}
                    >
                      Next Target Date
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!accountData["col17"] ? "bg-purple-50" : ""}`}
                    >
                      Remarks
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!accountData["col17"] ? "bg-orange-50" : ""}`}
                    >
                      Upload Image
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccountData.length > 0 ? (
                    filteredAccountData.map((account) => {
                      const isSelected = selectedItems.has(account._id)
                      const rowColorClass = getRowColor(account["col17"])
                      return (
                        <tr
                          key={account._id}
                          className={`${isSelected ? "bg-purple-50" : ""} hover:bg-gray-50 ${rowColorClass}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              checked={isSelected}
                              onChange={(e) => handleCheckboxClick(e, account._id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{account["col1"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{account["col2"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{account["col3"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{account["col4"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate" title={account["col5"]}>
                              {account["col5"] || "—"}
                            </div>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-yellow-50" : ""}`}>
                            <div className="text-sm text-gray-900">{formatDateForDisplay(account["col6"])}</div>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-green-50" : ""}`}>
                            <div className="text-sm text-gray-900">{formatDateForDisplay(account["col10"])}</div>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-blue-50" : ""}`}>
                            <select
                              disabled={!isSelected}
                              value={statusData[account._id] || ""}
                              onChange={(e) => handleStatusChange(account._id, e.target.value)}
                              className="border border-gray-300 rounded-md px-2 py-1 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">Select</option>
                              <option value="Done">Done</option>
                              <option value="Extend date">Extend date</option>
                            </select>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-indigo-50" : ""}`}>
                            <input
                              type="date"
                              disabled={!isSelected || statusData[account._id] !== "Extend date"}
                              value={
                                nextTargetDate[account._id]
                                  ? (() => {
                                    const dateStr = nextTargetDate[account._id]
                                    if (dateStr && dateStr.includes("/")) {
                                      const [day, month, year] = dateStr.split("/")
                                      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
                                    }
                                    return dateStr
                                  })()
                                  : ""
                              }
                              onChange={(e) => {
                                const inputDate = e.target.value
                                if (inputDate) {
                                  const [year, month, day] = inputDate.split("-")
                                  const formattedDate = `${day}/${month}/${year}`
                                  handleNextTargetDateChange(account._id, formattedDate)
                                } else {
                                  handleNextTargetDateChange(account._id, "")
                                }
                              }}
                              className="border border-gray-300 rounded-md px-2 py-1 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-purple-50" : ""}`}>
                            <input
                              type="text"
                              placeholder="Enter remarks"
                              disabled={!isSelected}
                              value={remarksData[account._id] || ""}
                              onChange={(e) => setRemarksData((prev) => ({ ...prev, [account._id]: e.target.value }))}
                              className="border rounded-md px-2 py-1 w-full border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-orange-50" : ""}`}>
                            {account.image ? (
                              <div className="flex items-center">
                                <img
                                  src={
                                    typeof account.image === "string"
                                      ? account.image
                                      : URL.createObjectURL(account.image)
                                  }
                                  alt="Receipt"
                                  className="h-10 w-10 object-cover rounded-md mr-2"
                                />
                                <div className="flex flex-col">
                                  <span className="text-xs text-gray-500">
                                    {account.image instanceof File ? account.image.name : "Uploaded Receipt"}
                                  </span>
                                  {account.image instanceof File ? (
                                    <span className="text-xs text-green-600">Ready to upload</span>
                                  ) : (
                                    <button
                                      className="text-xs text-purple-600 hover:text-purple-800"
                                      onClick={() => window.open(account.image, "_blank")}
                                    >
                                      View Full Image
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <label
                                className={`flex items-center cursor-pointer ${account["col9"]?.toUpperCase() === "YES"
                                    ? "text-red-600 font-medium"
                                    : "text-purple-600"
                                  } hover:text-purple-800`}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                <span className="text-xs">
                                  {account["col9"]?.toUpperCase() === "YES" ? "Required Upload" : "Upload Image"}
                                  {account["col9"]?.toUpperCase() === "YES" && (
                                    <span className="text-red-500 ml-1">*</span>
                                  )}
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(account._id, e)}
                                  disabled={!isSelected}
                                />
                              </label>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={12} className="px-6 py-4 text-center text-gray-500">
                        {searchTerm
                          ? "No tasks matching your search"
                          : "No pending tasks found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DelegationDataPage
