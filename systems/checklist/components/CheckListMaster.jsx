import React, { useState, useEffect, useMemo } from "react"
import { Search, Users, AlertCircle, RefreshCw, KeyRound, Shield, Building2, User, Copy, Check, Eye, EyeOff } from "lucide-react"
import { API_URL, getToken } from "@/lib/auth"

const CheckListMaster = () => {
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  
  // Filter states
  const [filterFirm, setFilterFirm] = useState("all")
  const [filterRole, setFilterRole] = useState("all")
  const [filterGivenBy, setFilterGivenBy] = useState("all")

  // Password visibility and copy states
  const [visiblePasswords, setVisiblePasswords] = useState({})
  const [copiedId, setCopiedId] = useState(null)

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 250)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const fetchMasterRecords = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/checklist/master`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch checklist master data (${response.status})`)
      }
      const result = await response.json()
      setRecords(result.data || [])
    } catch (err) {
      console.error("Error fetching checklist master:", err)
      setError("Failed to load checklist master data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMasterRecords()
  }, [])

  // Derived filter options
  const filterOptions = useMemo(() => {
    const firms = new Set()
    const roles = new Set()
    const givenBys = new Set()
    
    records.forEach(r => {
      if (r.firm && String(r.firm).trim()) firms.add(String(r.firm).trim())
      if (r.role && String(r.role).trim()) roles.add(String(r.role).trim())
      if (r.givenBy && String(r.givenBy).trim()) givenBys.add(String(r.givenBy).trim())
    })
    
    return {
      firms: Array.from(firms).sort(),
      roles: Array.from(roles).sort(),
      givenBys: Array.from(givenBys).sort()
    }
  }, [records])

  const filteredRecords = useMemo(() => {
    let result = records

    if (filterFirm && filterFirm !== "all") {
      result = result.filter(r => (r.firm || "").trim().toLowerCase() === filterFirm.trim().toLowerCase())
    }
    if (filterRole && filterRole !== "all") {
      result = result.filter(r => (r.role || "").trim().toLowerCase() === filterRole.trim().toLowerCase())
    }
    if (filterGivenBy && filterGivenBy !== "all") {
      result = result.filter(r => (r.givenBy || "").trim().toLowerCase() === filterGivenBy.trim().toLowerCase())
    }

    const query = debouncedSearchQuery.toLowerCase().trim()
    if (query) {
      result = result.filter(r => {
        const firm = (r.firm || "").toLowerCase()
        const givenBy = (r.givenBy || "").toLowerCase()
        const doerName = (r.doerName || "").toLowerCase()
        const role = (r.role || "").toLowerCase()
        return (
          firm.includes(query) ||
          givenBy.includes(query) ||
          doerName.includes(query) ||
          role.includes(query)
        )
      })
    }
    
    return result
  }, [records, debouncedSearchQuery, filterFirm, filterRole, filterGivenBy])

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const copyPassword = (id, password) => {
    if (!password) return
    navigator.clipboard.writeText(password)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getRoleBadgeStyle = (role) => {
    const r = (role || "").toLowerCase().trim()
    if (r === "admin") {
      return "bg-purple-50 text-purple-700 border-purple-200"
    } else if (r === "user") {
      return "bg-blue-50 text-blue-700 border-blue-200"
    } else if (r === "manager") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    }
    return "bg-slate-100 text-slate-700 border-slate-200"
  }

  return (
    <div className="dashboard-container">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Checklist Master
            </h1>
            <p className="text-sm text-slate-500 mt-1">Master users, assigners, firms, and credentials list</p>
          </div>
          <button 
            onClick={fetchMasterRecords}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm font-medium text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* Filter and Table Container */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-4">
            
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search across Firm, Given By, Doer's Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
                />
              </div>
              
              <div className="flex flex-wrap gap-3">
                {/* Firm Filter */}
                <select 
                  value={filterFirm}
                  onChange={(e) => setFilterFirm(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 shadow-sm min-w-[140px]"
                >
                  <option value="all">All Firms</option>
                  {filterOptions.firms.map(firm => (
                    <option key={firm} value={firm}>{firm}</option>
                  ))}
                </select>

                {/* Role Filter */}
                <select 
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 shadow-sm min-w-[130px]"
                >
                  <option value="all">All Roles</option>
                  {filterOptions.roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>

                {/* Given By Filter */}
                {filterOptions.givenBys.length > 0 && (
                  <select 
                    value={filterGivenBy}
                    onChange={(e) => setFilterGivenBy(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 shadow-sm min-w-[140px]"
                  >
                    <option value="all">All Given By</option>
                    {filterOptions.givenBys.map(gb => (
                      <option key={gb} value={gb}>{gb}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Loading Checklist Master data...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-rose-500">
                <AlertCircle className="h-10 w-10 mb-3" />
                <p className="font-medium">{error}</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Users className="h-10 w-10 mb-3 text-slate-300" />
                <p className="font-medium">No records found.</p>
                {(searchQuery || filterFirm !== "all" || filterRole !== "all" || filterGivenBy !== "all") && (
                  <p className="text-sm mt-1">Try adjusting your search query or filters.</p>
                )}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Firm</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Given By</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Doer's Name</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredRecords.map((item) => {
                    const isPasswordVisible = visiblePasswords[item.id]
                    const isCopied = copiedId === item.id

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Firm */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.firm ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <Building2 className="h-3 w-3 text-slate-500" />
                              {item.firm}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">—</span>
                          )}
                        </td>

                        {/* Given By */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.givenBy ? (
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                {item.givenBy.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-slate-700">{item.givenBy}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">—</span>
                          )}
                        </td>

                        {/* Doer's Name */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
                              {(item.doerName || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{item.doerName || "—"}</span>
                          </div>
                        </td>

                        {/* Password */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.password ? (
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                              <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                              <span className="font-mono text-xs text-slate-800 font-medium">
                                {isPasswordVisible ? item.password : "••••••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(item.id)}
                                title={isPasswordVisible ? "Hide Password" : "Show Password"}
                                className="p-0.5 text-slate-400 hover:text-slate-600 ml-1 rounded"
                              >
                                {isPasswordVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyPassword(item.id, item.password)}
                                title="Copy Password"
                                className="p-0.5 text-slate-400 hover:text-blue-600 rounded"
                              >
                                {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">—</span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.role ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeStyle(item.role)}`}>
                              <Shield className="h-3 w-3" />
                              {item.role}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          {!isLoading && !error && filteredRecords.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center text-sm text-slate-500">
              <span>Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> records</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CheckListMaster
