"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, Upload, X, Search, History, ArrowLeft, Filter, Sparkles, FileText, ChevronRight, User, Calendar } from "lucide-react"
import { API_URL, getToken, getStoredUser } from "@/lib/auth"

const COMPANIES = [
  { id: "pmmpl",     name: "PMMPL",     SHEET_NAME: "PMMPL",     DRIVE_FOLDER_ID: "1wY0PCy9GfMHzh046D3Rj_O1JrujpiD_f" },
  { id: "rkl",       name: "RKL",       SHEET_NAME: "RKL",       DRIVE_FOLDER_ID: "BTXTHd-Mi58N0w1YRci-2Ow2V9GqsNww" },
  { id: "refrasynth",name: "REFRASYNTH",SHEET_NAME: "REFRASYNTH",DRIVE_FOLDER_ID: "1P6jC4X8eMoyPUOUCFp8G30I83aAeEIy9" },
  { id: "refratech", name: "REFRATECH", SHEET_NAME: "REFRATECH", DRIVE_FOLDER_ID: "1P6jC4X8eMoyPUOUCFp8G30I83aAeEIy9" },
  { id: "purab",     name: "PURAB",     SHEET_NAME: "PURAB",     DRIVE_FOLDER_ID: "1IENpXhLEgB7lI8VAMc0qPIqtQgBcPDcM" },
]

function formatDateToDDMMYYYY(date) {
  if (!date) return ""
  const d = new Date(date)
  if (isNaN(d.getTime())) return ""
  const day = d.getDate().toString().padStart(2, "0")
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  return `${day}/${month}/${d.getFullYear()}`
}

function parseDateFromDDMMYYYY(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null
  const p = dateStr.split("/")
  if (p.length !== 3) return null
  return new Date(p[2], p[1] - 1, p[0])
}

// ─── inner content (Single Company) ───────────────────────────────────────────
function CompanyTaskContent({ config }) {
  const [accountData, setAccountData]     = useState([])
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [isSubmitting, setIsSubmitting]   = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [additionalData, setAdditionalData] = useState({})
  const [searchTerm, setSearchTerm]       = useState("")
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [remarksData, setRemarksData]     = useState({})
  const [historyData, setHistoryData]     = useState([])
  const [showHistory, setShowHistory]     = useState(false)
  const [membersList, setMembersList]     = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [startDate, setStartDate]         = useState("")
  const [endDate, setEndDate]             = useState("")
  const [userRole, setUserRole]           = useState("")
  const [username, setUsername]           = useState("")
  const [filterGivenBy, setFilterGivenBy] = useState("")
  const [filterName, setFilterName]       = useState("")

  useEffect(() => {
    const stored = getStoredUser()
    setUserRole((stored?.role || sessionStorage.getItem("role") || "admin").toLowerCase())
    setUsername(stored?.username || sessionStorage.getItem("username") || "")
  }, [])

  // reset all state when company tab switches
  useEffect(() => {
    setAccountData([])
    setHistoryData([])
    setSelectedItems(new Set())
    setAdditionalData({})
    setRemarksData({})
    setSearchTerm("")
    setSelectedMembers([])
    setStartDate("")
    setEndDate("")
    setShowHistory(false)
    setSuccessMessage("")
    setError(null)
    setLoading(true)
    setFilterGivenBy("")
    setFilterName("")
  }, [config.id])

  const sortDateWise = (a, b) => {
    const da = parseDateFromDDMMYYYY(a["col6"] || "")
    const db = parseDateFromDDMMYYYY(b["col6"] || "")
    if (!da) return 1
    if (!db) return -1
    return da - db
  }

  const resetFilters = () => {
    setSearchTerm(""); setSelectedMembers([]); setStartDate(""); setEndDate("")
  }

  const givenByOptions = useMemo(() =>
    [...new Set(accountData.map(t => t["col3"]).filter(Boolean))].sort()
  , [accountData])

  const nameOptions = useMemo(() =>
    [...new Set(accountData.map(t => t["col4"]).filter(Boolean))].sort()
  , [accountData])

  const filteredAccountData = useMemo(() => {
    const f = accountData.filter(a => {
      const matchSearch = searchTerm
        ? Object.values(a).some(v => v && v.toString().toLowerCase().includes(searchTerm.toLowerCase()))
        : true
      const matchGivenBy = filterGivenBy ? a["col3"] === filterGivenBy : true
      const matchName = filterName ? a["col4"] === filterName : true
      return matchSearch && matchGivenBy && matchName
    })
    return [...f].sort(sortDateWise)
  }, [accountData, searchTerm, filterGivenBy, filterName])

  const filteredHistoryData = useMemo(() => {
    return historyData
      .filter(item => {
        const matchSearch = searchTerm
          ? Object.values(item).some(v => v && v.toString().toLowerCase().includes(searchTerm.toLowerCase()))
          : true
        const matchMember = selectedMembers.length > 0 ? selectedMembers.includes(item["col4"]) : true
        let matchDate = true
        if (startDate || endDate) {
          const d = parseDateFromDDMMYYYY(item["col10"])
          if (!d) return false
          if (startDate && d < new Date(startDate)) matchDate = false
          if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); if (d > e) matchDate = false }
        }
        return matchSearch && matchMember && matchDate
      })
      .sort((a, b) => {
        const da = parseDateFromDDMMYYYY(a["col10"] || "")
        const db = parseDateFromDDMMYYYY(b["col10"] || "")
        if (!da) return 1; if (!db) return -1
        return db - da
      })
  }, [historyData, searchTerm, selectedMembers, startDate, endDate])

  const getFilteredMembersList = () =>
    userRole === "admin" ? membersList : membersList.filter(m => m.toLowerCase() === username.toLowerCase())

  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true)
      const resp = await fetch(`${API_URL}/checklist/task`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const resData = await resp.json()

      const stored = getStoredUser()
      const curUser = stored?.username || sessionStorage.getItem("username") || ""
      const curRole = (stored?.role || sessionStorage.getItem("role") || "admin").toLowerCase()
      const today = new Date()
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1)
      const todayStr = formatDateToDDMMYYYY(today)
      const tomorrowStr = formatDateToDDMMYYYY(tomorrow)
      const membersSet = new Set()

      const pending = [], history = []

      // Filter tasks by the active company/department tab
      const deptTasks = (resData.data || []).filter(
        t => t.department && t.department.name.toLowerCase() === config.SHEET_NAME.toLowerCase()
      );

      deptTasks.forEach((task, ri) => {
        const assignedTo = task.assignedTo || "Unassigned"
        membersSet.add(assignedTo)
        const isMatch = curRole === "admin" || !curUser || assignedTo.toLowerCase() === curUser.toLowerCase()
        if (!isMatch) return

        if (task.status === "DONE" || task.status === "Completed" || task.status === "Verified") {
           // Completed task logic
           const rowData = {
              _id: task.id,
              _rowIndex: ri + 1,
              _taskId: task.taskSeq || task.id,
              col0: task.createdAt ? formatDateToDDMMYYYY(task.createdAt) : "",
              col1: task.taskSeq || task.id,
              col2: task.department.name,
              col3: task.givenBy || "",
              col4: task.assignedTo || "",
              col5: task.description || "",
              col6: task.dueDate ? formatDateToDDMMYYYY(task.dueDate) : "",
              col7: task.frequency || "",
              col10: task.completedAt ? formatDateToDDMMYYYY(task.completedAt) : "",
              col12: task.status === "Completed" || task.status === "Verified" ? "DONE" : task.status,
              col13: task.remarks || "",
              col14: task.attachmentUrl || ""
           };
           history.push(rowData);
        } else {
           // Pending task logic
           const fmtDate = task.dueDate ? formatDateToDDMMYYYY(task.dueDate) : ""
           const d = task.dueDate ? new Date(task.dueDate) : null
           
           if (fmtDate === todayStr || fmtDate === tomorrowStr || (d && d <= today)) {
             const rowData = {
                _id: task.id,
                _rowIndex: ri + 1,
                _taskId: task.taskSeq || task.id,
                col0: task.createdAt ? formatDateToDDMMYYYY(task.createdAt) : "",
                col1: task.taskSeq || task.id,
                col2: task.department.name,
                col3: task.givenBy || "",
                col4: task.assignedTo || "",
                col5: task.description || "",
                col6: fmtDate,
                col7: task.frequency || "",
             };
             pending.push(rowData);
           }
        }
      })

      setMembersList([...membersSet].sort())
      setAccountData(pending)
      setHistoryData(history)
      setLoading(false)
    } catch (err) {
      setError("Failed to load: " + err.message)
      setLoading(false)
    }
  }, [config.SHEET_NAME]);

  useEffect(() => { fetchSheetData() }, [fetchSheetData])

  const handleSelectItem = useCallback((id, checked) => {
    setSelectedItems(prev => {
      const n = new Set(prev)
      if (checked) { n.add(id) }
      else {
        n.delete(id)
        setAdditionalData(p => { const d={...p}; delete d[id]; return d })
        setRemarksData(p => { const d={...p}; delete d[id]; return d })
      }
      return n
    })
  }, [])

  const handleCheckboxClick = useCallback((e, id) => {
    e.stopPropagation(); handleSelectItem(id, e.target.checked)
  }, [handleSelectItem])

  const handleSelectAll = useCallback((e) => {
    e.stopPropagation()
    if (e.target.checked) { setSelectedItems(new Set(filteredAccountData.map(i => i._id))) }
    else { setSelectedItems(new Set()); setAdditionalData({}); setRemarksData({}) }
  }, [filteredAccountData])

  const handleImageUpload = (id, e) => {
    const file = e.target.files[0]; if (!file) return
    setAccountData(prev => prev.map(item => item._id === id ? {...item, image: file} : item))
  }

  const toggleHistory = () => { setShowHistory(p => !p); resetFilters() }

  const handleSubmit = async () => {
    if (selectedItems.size === 0) return;
    
    setIsSubmitting(true);
    let successCount = 0;
    
    try {
      const stored = getStoredUser();
      const curUser = stored?.username || sessionStorage.getItem("username") || "Unknown";
      const selectedItemsArray = Array.from(selectedItems);
      
      for (const id of selectedItemsArray) {
        const item = accountData.find(a => a._id === id);
        if (!item) continue;
        
        let attachmentUrl = "";
        
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
        
        const res = await fetch(`${API_URL}/checklist/task/${item.col1}/complete`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify({
            status: additionalData[id] || "Completed",
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

  const selectedCount = selectedItems.size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-blue-700">
              {showHistory ? `${config.name} History` : `${config.name} Tasks`}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {showHistory ? "Read-only view of completed tasks" : "Today, tomorrow and past-due tasks"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={toggleHistory}
            className="flex items-center gap-2 rounded-xl py-2.5 px-5 border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all shadow-sm text-sm">
            {showHistory ? <><ArrowLeft className="h-4 w-4"/><span>Pending Tasks</span></> : <><History className="h-4 w-4"/><span>Task History</span></>}
          </button>
          {!showHistory && (
            <button onClick={handleSubmit} disabled={selectedCount===0||isSubmitting}
              className={`flex items-center gap-2 rounded-xl py-2.5 px-5 text-white font-semibold transition-all shadow-md text-sm ${selectedCount===0||isSubmitting?"bg-slate-300 cursor-not-allowed":"bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"}`}>
              {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}
              <span>{isSubmitting ? "Processing..." : `Submit (${selectedCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Filter className="h-4 w-4 text-blue-600"/>
            <span className="text-sm">Filters</span>
          </div>
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
            <input type="text" placeholder={showHistory?"Search history...":"Search tasks..."}
              value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
          </div>
            {!showHistory && (
              <>
                <select value={filterGivenBy} onChange={e=>setFilterGivenBy(e.target.value)}
                  className="min-w-[130px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-700">
                  <option value="">All Given By</option>
                  {givenByOptions.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
                <select value={filterName} onChange={e=>setFilterName(e.target.value)}
                  className="min-w-[130px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-700">
                  <option value="">All Names</option>
                  {nameOptions.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
                {(filterGivenBy || filterName || searchTerm) && (
                  <button onClick={()=>{setFilterGivenBy("");setFilterName("");setSearchTerm("")}}
                    className="py-2 px-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100">
                    Clear Filters
                  </button>
                )}
              </>
            )}

          {showHistory && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400"/>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                className="border border-slate-300 rounded-lg text-sm py-2 px-3 focus:border-blue-500 outline-none"/>
              <span className="text-slate-400 text-sm">to</span>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                className="border border-slate-300 rounded-lg text-sm py-2 px-3 focus:border-blue-500 outline-none"/>
            </div>
          )}
        </div>

        {showHistory && getFilteredMembersList().length > 0 && (
          <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap gap-2 items-center">
            <User className="h-4 w-4 text-slate-400"/>
            {getFilteredMembersList().map((m,i) => (
              <button key={i} onClick={()=>setSelectedMembers(p=>p.includes(m)?p.filter(x=>x!==m):[...p,m])}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${selectedMembers.includes(m)?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {m}
              </button>
            ))}
            {(selectedMembers.length>0||startDate||endDate||searchTerm) && (
              <button onClick={resetFilters} className="px-3 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-100">
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500"/>{successMessage}</div>
          <button onClick={()=>setSuccessMessage("")}><X className="h-4 w-4"/></button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><FileText className="h-4 w-4 text-blue-600"/></div>
          <div>
            <p className="text-sm font-bold text-slate-800">{showHistory?"Historical Submission Log":"Active Processing Queue"}</p>
            <p className="text-xs text-slate-500">{showHistory?`${filteredHistoryData.length} records`:`${filteredAccountData.length} pending items`}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3"/>
            <p className="text-slate-500 text-sm">Loading {config.name} data...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-sm">
            {error} <button className="underline ml-1" onClick={fetchSheetData}>Retry</button>
          </div>
        ) : showHistory ? (
          /* History Table */
          <>
            {/* Stats bar */}
            <div className="p-4 bg-blue-50 border-b border-blue-100 flex flex-wrap gap-4">
              <div className="px-3 py-2 bg-white rounded-lg shadow-sm">
                <p className="text-xs text-slate-500">Total Completed</p>
                <p className="text-lg font-bold text-blue-600">{historyData.length}</p>
              </div>
              {(selectedMembers.length>0||startDate||endDate||searchTerm) && (
                <div className="px-3 py-2 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-slate-500">Filtered</p>
                  <p className="text-lg font-bold text-blue-600">{filteredHistoryData.length}</p>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Task ID","Department","Given By","Name","Task Description","Task Start Date","Freq","Enable Reminders","Require Attachment","Actual Date","Status","Remarks","Attachment"].map(h=>(
                      <th key={h} className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${h==="Task Start Date"?"bg-yellow-50":h==="Actual Date"?"bg-green-50":h==="Status"?"bg-blue-50":h==="Remarks"?"bg-purple-50":""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHistoryData.length>0 ? filteredHistoryData.map(h=>(
                    <tr key={h._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{h["col1"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{h["col2"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{h["col3"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{h["col4"]||"—"}</td>
                      <td className="px-4 py-3 max-w-xs truncate" title={h["col5"]}>{h["col5"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap bg-yellow-50">{h["col6"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{h["col7"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{h["col8"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{h["col9"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap bg-green-50 font-medium">{h["col10"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap bg-blue-50">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${h["col12"]==="Yes"?"bg-green-100 text-green-800":h["col12"]==="No"?"bg-red-100 text-red-800":"bg-gray-100 text-gray-800"}`}>
                          {h["col12"]||"—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 bg-purple-50 max-w-xs" title={h["col13"]}>{h["col13"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {h["col14"] ? (
                          <a href={h["col14"]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
                            <img src={h["col14"]} alt="Attachment" className="h-7 w-7 object-cover rounded"/>View
                          </a>
                        ) : <span className="text-gray-400 text-xs">No attachment</span>}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={13} className="py-6 text-center text-gray-400 text-sm">No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Pending Table */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={filteredAccountData.length>0 && selectedItems.size===filteredAccountData.length}
                      onChange={handleSelectAll}/>
                  </th>
                  {["Task ID","Department","Given By","Name","Task Description","Task Start Date","Freq","Enable Reminders","Require Attachment","Status","Remarks","Upload Image"].map(h=>(
                    <th key={h} className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${h==="Task Start Date"?"bg-yellow-50":""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccountData.length>0 ? filteredAccountData.map(acc=>{
                  const isSel = selectedItems.has(acc._id)
                  return (
                    <tr key={acc._id} className={`${isSel?"bg-blue-50/40":""} hover:bg-gray-50 transition-colors`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={isSel} onChange={e=>handleCheckboxClick(e,acc._id)}/>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col1"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col2"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col3"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col4"]||"—"}</td>
                      <td className="px-4 py-3 max-w-xs truncate" title={acc["col5"]}>{acc["col5"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap bg-yellow-50">{acc["col6"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col7"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col8"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col9"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap bg-yellow-50">
                        <select disabled={!isSel} value={additionalData[acc._id]||""}
                          onChange={e=>{ setAdditionalData(p=>({...p,[acc._id]:e.target.value})); if(e.target.value!=="No") setRemarksData(p=>{const d={...p};delete d[acc._id];return d}) }}
                          className="border border-gray-300 rounded px-2 py-1 w-24 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed">
                          <option value="">Select...</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap bg-orange-50">
                        <input type="text" placeholder="Remarks" disabled={!isSel||!additionalData[acc._id]}
                          value={remarksData[acc._id]||""} onChange={e=>setRemarksData(p=>({...p,[acc._id]:e.target.value}))}
                          className="border border-gray-300 rounded px-2 py-1 w-36 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"/>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap bg-green-50">
                        {acc.image ? (
                          <div className="flex items-center gap-2">
                            <img src={typeof acc.image==="string"?acc.image:URL.createObjectURL(acc.image)} alt="Receipt" className="h-8 w-8 object-cover rounded"/>
                            <span className="text-xs text-green-600">{acc.image instanceof File?"Ready":"Uploaded"}</span>
                          </div>
                        ) : (
                          <label className="flex items-center gap-1 cursor-pointer text-xs text-blue-600 hover:underline">
                            <Upload className="h-4 w-4"/>
                            Upload
                            <input type="file" className="hidden" accept="image/*" disabled={!isSel} onChange={e=>handleImageUpload(acc._id,e)}/>
                          </label>
                        )}
                      </td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan={13} className="py-6 text-center text-gray-400 text-sm">No pending tasks</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ALL companies view ───────────────────────────────────────────────────────
function AllCompaniesContent() {
  const [allData, setAllData]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [searchTerm, setSearchTerm]   = useState("")
  const [filterGivenBy, setFilterGivenBy] = useState("")
  const [filterName, setFilterName]   = useState("")
  const [filterCompany, setFilterCompany] = useState("")

  const fetchAllCompanies = useCallback(async () => {
    try {
      setLoading(true)
      const resp = await fetch(`${API_URL}/checklist/task`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const resData = await resp.json()

      const stored = getStoredUser()
      const curUser = stored?.username || sessionStorage.getItem("username") || ""
      const curRole = (stored?.role || sessionStorage.getItem("role") || "admin").toLowerCase()
      const today = new Date()
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1)
      const todayStr = formatDateToDDMMYYYY(today)
      const tomorrowStr = formatDateToDDMMYYYY(tomorrow)

      const result = []
      const taskList = Array.isArray(resData.data) ? resData.data : []

      taskList.forEach((task, ri) => {
        if (task.status === "DONE" || task.status === "Completed" || task.status === "Verified") return
        const assignedTo = task.assignedTo || "Unassigned"
        if (curRole !== "admin" && curUser && assignedTo.toLowerCase() !== curUser.toLowerCase()) return

        const fmtDate = task.dueDate ? formatDateToDDMMYYYY(task.dueDate) : ""
        const d = task.dueDate ? new Date(task.dueDate) : null
        if (fmtDate !== todayStr && fmtDate !== tomorrowStr && !(d && d <= today)) return

        const companyName = task.department ? task.department.name : (task.taskType === 'delegation' ? 'DELEGATION' : 'Unassigned')

        result.push({
          _id: task.id,
          _company: companyName,
          col1: task.taskSeq || task.id,
          col2: companyName,
          col3: task.givenBy || "",
          col4: task.assignedTo || "",
          col5: task.description || "",
          col6: fmtDate,
          col7: task.frequency || "",
          col8: task.enableReminders ? "Yes" : "No",
          col9: task.requireAttachment ? "Yes" : "No",
        })
      })

      setAllData(result)
      setLoading(false)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllCompanies()
  }, [fetchAllCompanies])

  const givenByOptions = useMemo(()=>[...new Set(allData.map(t=>t.col3).filter(Boolean))].sort(),[allData])
  const nameOptions    = useMemo(()=>[...new Set(allData.map(t=>t.col4).filter(Boolean))].sort(),[allData])

  const filtered = useMemo(()=>allData.filter(t=>{
    const ms = searchTerm ? Object.values(t).some(v=>v&&v.toString().toLowerCase().includes(searchTerm.toLowerCase())) : true
    const mg = filterGivenBy ? t.col3===filterGivenBy : true
    const mn = filterName    ? t.col4===filterName    : true
    const mc = filterCompany ? t._company===filterCompany : true
    return ms&&mg&&mn&&mc
  }).sort((a,b)=>{
    const da=parseDateFromDDMMYYYY(a.col6), db=parseDateFromDDMMYYYY(b.col6)
    if(!da)return 1; if(!db)return -1; return da-db
  }),[allData,searchTerm,filterGivenBy,filterName,filterCompany])

  const companyOptions = Array.from(new Set(allData.map(c=>c._company))).sort()

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <Filter className="h-4 w-4 text-blue-600"/><span className="text-sm">Filters</span>
          </div>
          <div className="flex-1 min-w-[160px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
            <input type="text" placeholder="Search all companies..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
          </div>
          <select value={filterCompany} onChange={e=>setFilterCompany(e.target.value)}
            className="min-w-[120px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 text-slate-700">
            <option value="">All Companies</option>
            {companyOptions.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
          <select value={filterGivenBy} onChange={e=>setFilterGivenBy(e.target.value)}
            className="min-w-[130px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 text-slate-700">
            <option value="">All Given By</option>
            {givenByOptions.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
          <select value={filterName} onChange={e=>setFilterName(e.target.value)}
            className="min-w-[130px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 text-slate-700">
            <option value="">All Names</option>
            {nameOptions.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
          {(filterGivenBy||filterName||filterCompany||searchTerm) && (
            <button onClick={()=>{setFilterGivenBy("");setFilterName("");setFilterCompany("");setSearchTerm("")}}
              className="py-2 px-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><FileText className="h-4 w-4 text-blue-600"/></div>
          <div>
            <p className="text-sm font-bold text-slate-800">All Companies — Pending Tasks</p>
            <p className="text-xs text-slate-500">{filtered.length} tasks across all companies</p>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3"/>
            <p className="text-slate-500 text-sm">Loading all companies...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 text-sm">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Company","Task ID","Department","Given By","Name","Task Description","Task Start Date","Freq","Enable Reminders","Require Attachment"].map(h=>(
                    <th key={h} className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${h==="Task Start Date"?"bg-yellow-50":""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.length>0 ? filtered.map(t=>(
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">{t._company}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">{t.col1||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.col2||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.col3||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.col4||"—"}</td>
                    <td className="px-4 py-3 max-w-xs truncate" title={t.col5}>{t.col5||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap bg-yellow-50">{t.col6||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.col7||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.col8||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.col9||"—"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={10} className="py-8 text-center text-gray-400 text-sm">No pending tasks found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── wrapper page with tabs ────────────────────────────────────────────────────
export default function AllCompaniesPage() {
  const [activeTab, setActiveTab] = useState("all")

  const ALL_TABS = [{ id: "all", name: "ALL" }, ...COMPANIES]

  return (
    <div className="dashboard-container">
      <div className="max-w-7xl mx-auto pb-8 space-y-6">
        {/* Page title */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <Sparkles className="h-6 w-6 text-white"/>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              Check List Task Dashboards
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">All company task dashboards in one place</p>
          </div>
        </div>

        {/* Company tabs */}
        <div className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
          {ALL_TABS.map(c => (
            <button key={c.id} onClick={() => setActiveTab(c.id)}
              className={`flex-1 min-w-[70px] py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeTab === c.id
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              }`}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Active content */}
        {activeTab === "all"
          ? <AllCompaniesContent key="all"/>
          : <CompanyTaskContent key={activeTab} config={COMPANIES.find(c=>c.id===activeTab)}/>
        }
      </div>
    </div>
  )
}
