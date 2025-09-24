import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  BookmarkIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  GlobeAltIcon,
  UserGroupIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
  FolderIcon,
  PencilIcon,
  DocumentTextIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  FolderArrowDownIcon,
} from '@heroicons/react/24/outline';
import {
  BookmarkIcon as BookmarkSolidIcon,
  ClockIcon as ClockSolidIcon,
  CloudArrowUpIcon as CloudArrowUpSolidIcon,
  ChartBarIcon as ChartBarSolidIcon,
  FolderIcon as FolderSolidIcon,
} from '@heroicons/react/24/solid';

const API_BASE = "http://localhost:8000";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <p className="text-sm text-red-600 mb-2">Something went wrong</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const NexusBrowser = ({ darkMode }) => {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedCid, setUploadedCid] = useState('');
  const [trending, setTrending] = useState([]);
  const [visibility, setVisibility] = useState("public");

  // Analytics state with proper initialization
  const [analytics, setAnalytics] = useState(null);
  const [realtimeAnalytics, setRealtimeAnalytics] = useState(null);
  const [cidAnalytics, setCidAnalytics] = useState({});
  const [selectedAnalyticsPeriod, setSelectedAnalyticsPeriod] = useState(30);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedCidForAnalytics, setSelectedCidForAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);

  // Groups state
  const [groups, setGroups] = useState([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
  const [selectedCidForGroup, setSelectedCidForGroup] = useState('');
  const [showRenameGroupModal, setShowRenameGroupModal] = useState(false);
  const [groupToRename, setGroupToRename] = useState(null);
  const [renameGroupName, setRenameGroupName] = useState('');

  // Manual CID input for groups
  const [showAddCidModal, setShowAddCidModal] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState(null);
  const [manualCid, setManualCid] = useState('');

  // UI state for upload modal
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState(null);
  
  // Sidebar state - FIXED: Default to true to show sidebar by default
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('history');

  // Folder upload states
  const [uploadType, setUploadType] = useState('file');
  const [folderUploadProgress, setFolderUploadProgress] = useState(null);
  const [folderUploadResults, setFolderUploadResults] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
    fetchTrending();
    fetchBookmarks();
    fetchUploads();
    fetchGroups();
    fetchAnalyticsDashboard();
    
    const realtimeInterval = setInterval(fetchRealtimeAnalytics, 30000);
    return () => clearInterval(realtimeInterval);
  }, []);

  // FIXED: Improved section handling
  const handleSectionClick = (section) => {
    console.log('Section clicked:', section); // Debug log
    
    // If clicking the same section and sidebar is open, close it
    if (activeSection === section && sidebarOpen) {
      setSidebarOpen(false);
    } else {
      // Otherwise, set the new section and ensure sidebar is open
      setActiveSection(section);
      setSidebarOpen(true);
      
      // Fetch data based on section
      if (section === 'analytics') {
        fetchAnalyticsDashboard(selectedAnalyticsPeriod);
        fetchRealtimeAnalytics();
      } else if (section === 'groups') {
        fetchGroups();
      } else if (section === 'bookmarks') {
        fetchBookmarks();
      } else if (section === 'uploads') {
        fetchUploads();
      } else if (section === 'history') {
        fetchHistory();
      }
    }
  };

  // Existing fetch functions with better error handling
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Failed to fetch history:", err);
      setHistory([]);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const res = await fetch(`${API_BASE}/bookmarks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBookmarks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Failed to fetch bookmarks:", err);
      setBookmarks([]);
    }
  };

  const fetchUploads = async () => {
    try {
      const res = await fetch(`${API_BASE}/uploads`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUploads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Failed to fetch uploads:", err);
      setUploads([]);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${API_BASE}/groups`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Failed to fetch groups:", err);
      setGroups([]);
    }
  };

  // Analytics functions with proper error handling
  const fetchAnalyticsDashboard = async (days = 30) => {
    try {
      const res = await fetch(`${API_BASE}/analytics/dashboard?days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) {
        console.error("Analytics error:", data.error);
        setAnalytics(null);
      } else {
        setAnalytics(data);
      }
    } catch (err) {
      console.error("❌ Failed to fetch analytics dashboard:", err);
      setAnalytics(null);
    }
  };

  const fetchRealtimeAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/realtime`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) {
        console.error("Realtime analytics error:", data.error);
        setRealtimeAnalytics(null);
      } else {
        setRealtimeAnalytics(data);
      }
    } catch (err) {
      console.error("❌ Failed to fetch realtime analytics:", err);
      setRealtimeAnalytics(null);
    }
  };

  const fetchCidAnalytics = async (cid, days = 7) => {
    if (!cid) {
      console.error("No CID provided for analytics");
      return;
    }
    try {
      setAnalyticsError(null);
      const res = await fetch(`${API_BASE}/analytics/cid/${cid}?days=${days}`);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (data.error) {
        setAnalyticsError(data.error);
        setCidAnalytics(prev => ({
          ...prev,
          [cid]: { error: data.error }
        }));
        return;
      }
      
      const safeData = {
        total_views: data.total_views || 0,
        total_downloads: data.total_downloads || 0,
        unique_users: data.unique_users || 0,
        peak_day: data.peak_day || null,
        peak_day_views: data.peak_day_views || 0,
        views_over_time: Array.isArray(data.views_over_time) ? data.views_over_time : [],
        downloads_over_time: Array.isArray(data.downloads_over_time) ? data.downloads_over_time : [],
        traffic_sources: Array.isArray(data.traffic_sources) ? data.traffic_sources : [],
        recent_activity: Array.isArray(data.recent_activity) ? data.recent_activity : [],
        filename: data.filename || 'Unknown File'
      };
      
      setCidAnalytics(prev => ({
        ...prev,
        [cid]: safeData
      }));
      
    } catch (err) {
      console.error("❌ Failed to fetch CID analytics:", err);
      const errorMessage = err.message || "Failed to fetch analytics";
      setAnalyticsError(errorMessage);
      setCidAnalytics(prev => ({
        ...prev,
        [cid]: { error: errorMessage }
      }));
    }
  };

  const exportAnalytics = async (type, days = 30) => {
    try {
      const res = await fetch(`${API_BASE}/analytics/export?type=${type}&days=${days}`);
      if (!res.ok) {
        throw new Error('Failed to export analytics');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${type}_${days}days_uploaded_only.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("❌ Failed to export analytics:", err);
      alert("Failed to export analytics. Only uploaded content analytics are available.");
    }
  };

  const openCidAnalytics = (cid) => {
    if (!cid) {
      console.error("No CID provided for analytics");
      return;
    }

    try {
      console.log('Opening analytics for CID:', cid);
      setSelectedCidForAnalytics(cid);
      setAnalyticsError(null);
      setShowAnalyticsModal(true);
      fetchCidAnalytics(cid, 7);
    } catch (error) {
      console.error('Error opening analytics:', error);
      setAnalyticsError(error.message);
      setShowAnalyticsModal(false);
    }
  };

  // Group management functions
  const createGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setNewGroupName('');
        setShowCreateGroupModal(false);
        fetchGroups();
        alert(`Group "${data.name}" created successfully!`);
      } else {
        alert(data.error || 'Failed to create group');
      }
    } catch (err) {
      console.error("❌ Failed to create group:", err);
      alert('Failed to create group');
    }
  };

  const deleteGroup = async (groupId, groupName) => {
    if (window.confirm(`Are you sure you want to delete the group "${groupName}"? This will remove all CIDs from this group.`)) {
      try {
        const res = await fetch(`${API_BASE}/groups/${groupId}`, {
          method: "DELETE",
        });
        
        if (res.ok) {
          fetchGroups();
          setSelectedGroup(null);
          setShowGroupModal(false);
          alert(`Group "${groupName}" deleted successfully!`);
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to delete group');
        }
      } catch (err) {
        console.error("❌ Failed to delete group:", err);
        alert('Failed to delete group');
      }
    }
  };

  const renameGroup = async () => {
    if (!renameGroupName.trim()) {
      alert('Please enter a new group name');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/groups/${groupToRename.id}/rename`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameGroupName.trim() }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setRenameGroupName('');
        setShowRenameGroupModal(false);
        setGroupToRename(null);
        fetchGroups();
        if (selectedGroup && selectedGroup.id === groupToRename.id) {
          setSelectedGroup({ ...selectedGroup, name: renameGroupName.trim() });
        }
        alert(`Group renamed to "${data.new_name}" successfully!`);
      } else {
        alert(data.error || 'Failed to rename group');
      }
    } catch (err) {
      console.error("❌ Failed to rename group:", err);
      alert('Failed to rename group');
    }
  };

  const addCidToGroup = async (groupId, cid) => {
    try {
      const res = await fetch(`${API_BASE}/groups/${groupId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid }),
      });
      
      const data = await res.json();
      if (res.ok) {
        fetchGroups();
        setShowAddToGroupModal(false);
        setSelectedCidForGroup('');
        alert('CID added to group successfully!');
      } else {
        alert(data.error || 'Failed to add CID to group');
      }
    } catch (err) {
      console.error("❌ Failed to add CID to group:", err);
      alert('Failed to add CID to group');
    }
  };

  const addManualCidToGroup = async () => {
    if (!manualCid.trim()) {
      alert('Please enter a CID');
      return;
    }

    const cidPattern = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z2-7]{55,59})$/;
    if (!cidPattern.test(manualCid.trim())) {
      alert('Please enter a valid CID');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/groups/${targetGroupId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid: manualCid.trim() }),
      });
      
      const data = await res.json();
      if (res.ok) {
        fetchGroups();
        if (selectedGroup && selectedGroup.id === targetGroupId) {
          const updatedGroup = await fetch(`${API_BASE}/groups/${targetGroupId}`);
          const updatedGroupData = await updatedGroup.json();
          setSelectedGroup(updatedGroupData);
        }
        setShowAddCidModal(false);
        setManualCid('');
        setTargetGroupId(null);
        alert('CID added to group successfully!');
      } else {
        alert(data.error || 'Failed to add CID to group');
      }
    } catch (err) {
      console.error("❌ Failed to add CID to group:", err);
      alert('Failed to add CID to group');
    }
  };

  const removeCidFromGroup = async (groupId, cid) => {
    if (window.confirm('Are you sure you want to remove this CID from the group?')) {
      try {
        const res = await fetch(`${API_BASE}/groups/${groupId}/remove`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cid }),
        });
        
        if (res.ok) {
          fetchGroups();
          if (selectedGroup && selectedGroup.id === groupId) {
            const updatedGroup = { ...selectedGroup };
            updatedGroup.cids = updatedGroup.cids.filter(item => item.cid !== cid);
            updatedGroup.cid_count = updatedGroup.cids.length;
            setSelectedGroup(updatedGroup);
          }
          alert('CID removed from group successfully!');
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to remove CID from group');
        }
      } catch (err) {
        console.error("❌ Failed to remove CID from group:", err);
        alert('Failed to remove CID from group');
      }
    }
  };

  const openAddCidModal = (groupId) => {
    setTargetGroupId(groupId);
    setShowAddCidModal(true);
  };

  const openAddToGroupModal = (cid) => {
    setSelectedCidForGroup(cid);
    setShowAddToGroupModal(true);
  };

  const handleCidClick = (cid, fileType = null) => {
    navigate(`/search?q=${encodeURIComponent(cid)}`);
  };

  const getFileTypeIcon = (fileType, size = 'w-4 h-4') => {
    if (!fileType) return <DocumentIcon className={size} />;
    
    const type = fileType.toLowerCase();
    if (type.startsWith('image/')) return <PhotoIcon className={size} />;
    if (type.startsWith('video/')) return <FilmIcon className={size} />;
    if (type.startsWith('audio/')) return <MusicalNoteIcon className={size} />;
    if (type.startsWith('text/')) return <DocumentTextIcon className={size} />;
    return <DocumentIcon className={size} />;
  };

  const deleteBookmark = async (cid) => {
    try {
      await fetch(`${API_BASE}/bookmarks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid }),
      });
      setBookmarks((prev) => prev.filter((item) => item.cid !== cid));
    } catch (err) {
      console.error("❌ Failed to delete bookmark:", err);
    }
  };

  const deleteUpload = async (cid) => {
    try {
      await fetch(`${API_BASE}/uploads`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid }),
      });
      setUploads((prev) => prev.filter((item) => item.cid !== cid));
      fetchAnalyticsDashboard(selectedAnalyticsPeriod);
    } catch (err) {
      console.error("❌ Failed to delete upload:", err);
    }
  };

  const fetchTrending = async () => {
    try {
      const res = await fetch(`${API_BASE}/trending`);
      const data = await res.json();
      setTrending(data);
    } catch (err) {
      console.error("❌ Failed to fetch trending:", err);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const saveCidToHistory = async (cid) => {
    try {
      await fetch(`${API_BASE}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid }),
      });
      fetchHistory();
    } catch (err) {
      console.warn("⚠️ Failed to save CID to history:", err);
    }
  };

  const saveUploadToCid = async (cid, fileName, fileSize, fileType, visibility) => {
    try {
      await fetch(`${API_BASE}/uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          cid, 
          fileName, 
          fileSize, 
          fileType, 
          visibility,
          timestamp: new Date().toISOString()
        }),
      });
      fetchUploads();
    } catch (err) {
      console.warn("⚠️ Failed to save upload:", err);
    }
  };

  const deleteCidFromHistory = async (cid) => {
    try {
      await fetch(`${API_BASE}/history`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid }),
      });
      fetchHistory();
    } catch (err) {
      console.warn("⚠️ Failed to delete CID from history:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    setUploadedCid('');
    setFolderUploadResults([]);

    const isFolder = files.some(file => file.webkitRelativePath);

    if (isFolder) {
      await handleFolderUpload(files);
    } else {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('visibility', visibility);

      try {
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.cid) {
          setUploadedCid(data.cid);
          saveCidToHistory(data.cid);
          saveUploadToCid(data.cid, file.name, file.size, file.type, visibility);
          fetchAnalyticsDashboard(selectedAnalyticsPeriod);
        } else {
          throw new Error("No CID returned");
        }
      } catch (err) {
        console.error("Upload failed:", err);
        alert("❌ Upload failed.");
      }
    }

    setUploading(false);
  };

  const handleFolderUpload = async (files) => {
    try {
      setFolderUploadProgress({ current: 0, total: files.length, status: 'uploading' });
      
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('files', file);
        formData.append(`paths_${index}`, file.webkitRelativePath || file.name);
      });
      formData.append('visibility', visibility);
      formData.append('type', 'folder');

      const res = await fetch(`${API_BASE}/upload-folder`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (data.success) {
        if (data.folderCid) {
          setUploadedCid(data.folderCid);
          saveCidToHistory(data.folderCid);
          
          const folderName = files[0].webkitRelativePath.split('/');
          const totalSize = files.reduce((sum, file) => sum + file.size, 0);
          saveUploadToCid(data.folderCid, folderName, totalSize, 'folder', visibility);
        }

        if (data.files && Array.isArray(data.files)) {
          for (const fileResult of data.files) {
            if (fileResult.cid) {
              saveCidToHistory(fileResult.cid);
              const originalFile = files.find(f => f.webkitRelativePath === fileResult.path);
              if (originalFile) {
                saveUploadToCid(
                  fileResult.cid, 
                  fileResult.path, 
                  originalFile.size, 
                  originalFile.type, 
                  visibility
                );
              }
            }
          }
          setFolderUploadResults(data.files);
        }

        setFolderUploadProgress({ 
          current: files.length, 
          total: files.length, 
          status: 'completed',
          folderCid: data.folderCid 
        });
        
        fetchAnalyticsDashboard(selectedAnalyticsPeriod);
      } else {
        throw new Error(data.error || "Folder upload failed");
      }
    } catch (err) {
      console.error("Folder upload failed:", err);
      setFolderUploadProgress({ 
        current: 0, 
        total: files.length, 
        status: 'error', 
        error: err.message 
      });
      alert("❌ Folder upload failed: " + err.message);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const isCidUploaded = (cid) => {
    return uploads.some(upload => upload.cid === cid);
  };

  // FIXED: Add debug logging for sidebar rendering
  console.log('Sidebar state:', { sidebarOpen, activeSection });

  return (
    <div className={`flex min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-black'}`}>
      {/* Icon Sidebar */}
      <div className={`w-14 h-screen border-r flex flex-col items-center py-3 space-y-2 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* History Icon */}
        <button
          onClick={() => handleSectionClick('history')}
          className={`p-2.5 rounded-lg transition-all duration-200 hover:scale-105 group relative ${
            activeSection === 'history' && sidebarOpen
              ? darkMode 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-blue-500 text-white shadow-lg'
              : darkMode
              ? 'bg-gray-700/50 hover:bg-gray-600 text-gray-300 hover:text-white'
              : 'bg-gray-100/50 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
          }`}
          title="History"
        >
          {activeSection === 'history' && sidebarOpen ? (
            <ClockSolidIcon className="w-5 h-5" />
          ) : (
            <ClockIcon className="w-5 h-5" />
          )}
          <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            History
          </div>
        </button>

        {/* Bookmarks Icon */}
        <button
          onClick={() => handleSectionClick('bookmarks')}
          className={`p-2.5 rounded-lg transition-all duration-200 hover:scale-105 group relative ${
            activeSection === 'bookmarks' && sidebarOpen
              ? darkMode 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-blue-500 text-white shadow-lg'
              : darkMode
              ? 'bg-gray-700/50 hover:bg-gray-600 text-gray-300 hover:text-white'
              : 'bg-gray-100/50 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
          }`}
          title="Bookmarks"
        >
          {activeSection === 'bookmarks' && sidebarOpen ? (
            <BookmarkSolidIcon className="w-5 h-5" />
          ) : (
            <BookmarkIcon className="w-5 h-5" />
          )}
          <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            Bookmarks
          </div>
        </button>

        {/* Uploads Icon */}
        <button
          onClick={() => handleSectionClick('uploads')}
          className={`p-2.5 rounded-lg transition-all duration-200 hover:scale-105 group relative ${
            activeSection === 'uploads' && sidebarOpen
              ? darkMode 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-blue-500 text-white shadow-lg'
              : darkMode
              ? 'bg-gray-700/50 hover:bg-gray-600 text-gray-300 hover:text-white'
              : 'bg-gray-100/50 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
          }`}
          title="Uploads"
        >
          {activeSection === 'uploads' && sidebarOpen ? (
            <CloudArrowUpSolidIcon className="w-5 h-5" />
          ) : (
            <CloudArrowUpIcon className="w-5 h-5" />
          )}
          <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            Uploads
          </div>
        </button>

        {/* Groups Icon */}
        <button
          onClick={() => handleSectionClick('groups')}
          className={`p-2.5 rounded-lg transition-all duration-200 hover:scale-105 group relative ${
            activeSection === 'groups' && sidebarOpen
              ? darkMode 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-blue-500 text-white shadow-lg'
              : darkMode
              ? 'bg-gray-700/50 hover:bg-gray-600 text-gray-300 hover:text-white'
              : 'bg-gray-100/50 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
          }`}
          title="Groups"
        >
          {activeSection === 'groups' && sidebarOpen ? (
            <FolderSolidIcon className="w-5 h-5" />
          ) : (
            <FolderIcon className="w-5 h-5" />
          )}
          <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            Groups
          </div>
        </button>

        {/* Analytics Icon */}
        <button
          onClick={() => handleSectionClick('analytics')}
          className={`p-2.5 rounded-lg transition-all duration-200 hover:scale-105 group relative ${
            activeSection === 'analytics' && sidebarOpen
              ? darkMode 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-blue-500 text-white shadow-lg'
              : darkMode
              ? 'bg-gray-700/50 hover:bg-gray-600 text-gray-300 hover:text-white'
              : 'bg-gray-100/50 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
          }`}
          title="Analytics"
        >
          {activeSection === 'analytics' && sidebarOpen ? (
            <ChartBarSolidIcon className="w-5 h-5" />
          ) : (
            <ChartBarIcon className="w-5 h-5" />
          )}
          <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            Analytics
          </div>
        </button>
      </div>

      {/* FIXED: Content Sidebar - Improved conditional rendering */}
      <div className={`h-screen border-r overflow-y-auto transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'w-72' : 'w-0'
      } ${darkMode ? 'bg-gray-850/95 border-gray-700/50 backdrop-blur-sm' : 'bg-white/95 border-gray-200/50 backdrop-blur-sm'}`}>
        {/* FIXED: Only show content when sidebar is open */}
        {sidebarOpen && (
          <div className="p-3">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-1">
                {activeSection === 'history' ? (
                  <>
                    <ClockSolidIcon className="w-4 h-4 text-blue-500" />
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">History</h2>
                  </>
                ) : activeSection === 'bookmarks' ? (
                  <>
                    <BookmarkSolidIcon className="w-4 h-4 text-blue-500" />
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Bookmarks</h2>
                  </>
                ) : activeSection === 'uploads' ? (
                  <>
                    <CloudArrowUpSolidIcon className="w-4 h-4 text-blue-500" />
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Uploads</h2>
                  </>
                ) : activeSection === 'groups' ? (
                  <>
                    <FolderSolidIcon className="w-4 h-4 text-blue-500" />
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Groups</h2>
                  </>
                ) : (
                  <>
                    <ChartBarSolidIcon className="w-4 h-4 text-blue-500" />
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Analytics</h2>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {activeSection === 'history' 
                  ? `${history.length} items` 
                  : activeSection === 'bookmarks'
                  ? `${bookmarks.length} saved`
                  : activeSection === 'uploads'
                  ? `${uploads.length} files`
                  : activeSection === 'groups'
                  ? `${groups.length} groups`
                  : analytics ? `${analytics.period_days} days (uploaded content only)` : 'Loading...'
                }
              </p>
            </div>

            {/* History Section */}
            {activeSection === 'history' && (
              <div className="space-y-1.5">
                {history.length === 0 && (
                  <div className="text-center py-8">
                    <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">No history</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Your searches appear here
                    </p>
                  </div>
                )}
                {history.map((item, index) => (
                  <div
                    key={index}
                    className={`group p-2.5 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm ${
                      darkMode 
                        ? 'bg-gray-700/20 border-gray-600/30 hover:bg-gray-700/40 hover:border-gray-600/50' 
                        : 'bg-gray-50/30 border-gray-200/30 hover:bg-gray-100/60 hover:border-gray-300/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 min-w-0 pr-1.5"
                        onClick={() => handleCidClick(item.cid)}
                      >
                        <p className="text-xs font-mono text-blue-600 dark:text-blue-400 truncate">
                          {item.cid}
                        </p>
                        {item.timestamp && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddToGroupModal(item.cid);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/40 transition-all duration-200"
                          title="Add to Group"
                        >
                          <FolderIcon className="w-3.5 h-3.5 text-green-500" />
                        </button>
                        {isCidUploaded(item.cid) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCidAnalytics(item.cid);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200"
                            title="View Analytics"
                          >
                            <ChartBarIcon className="w-3.5 h-3.5 text-blue-500" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCidFromHistory(item.cid);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200"
                        >
                          <TrashIcon className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bookmarks Section */}
            {activeSection === 'bookmarks' && (
              <div className="space-y-1.5">
                {bookmarks.length === 0 && (
                  <div className="text-center py-8">
                    <BookmarkIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">No bookmarks</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Save content here
                    </p>
                  </div>
                )}
                {bookmarks.map((item, index) => (
                  <div
                    key={index}
                    className={`group p-2.5 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm ${
                      darkMode 
                        ? 'bg-gray-700/20 border-gray-600/30 hover:bg-gray-700/40 hover:border-gray-600/50' 
                        : 'bg-gray-50/30 border-gray-200/30 hover:bg-gray-100/60 hover:border-gray-300/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 min-w-0 pr-1.5"
                        onClick={() => handleCidClick(item.cid, item.type)}
                      >
                        <div className="flex items-center space-x-1.5 mb-1">
                          <BookmarkSolidIcon className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                          <p className="text-xs font-medium truncate">{item.title}</p>
                        </div>
                        <p className="text-xs font-mono text-blue-600 dark:text-blue-400 truncate">
                          {item.cid}
                        </p>
                        <div className="flex items-center space-x-1.5 mt-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatSize(item.size)}
                          </p>
                          <span className="text-xs text-gray-400">•</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.type?.split('/')[0] || 'file'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddToGroupModal(item.cid);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/40 transition-all duration-200"
                          title="Add to Group"
                        >
                          <FolderIcon className="w-3.5 h-3.5 text-green-500" />
                        </button>
                        {isCidUploaded(item.cid) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCidAnalytics(item.cid);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200"
                            title="View Analytics"
                          >
                            <ChartBarIcon className="w-3.5 h-3.5 text-blue-500" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBookmark(item.cid);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200"
                        >
                          <TrashIcon className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Uploads Section */}
            {activeSection === 'uploads' && (
              <div className="space-y-1.5">
                {uploads.length === 0 && (
                  <div className="text-center py-8">
                    <CloudArrowUpIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">No uploads</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Your uploaded files appear here
                    </p>
                  </div>
                )}
                {uploads.map((item, index) => (
                  <div
                    key={index}
                    className={`group p-2.5 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm ${
                      darkMode 
                        ? 'bg-gray-700/20 border-gray-600/30 hover:bg-gray-700/40 hover:border-gray-600/50' 
                        : 'bg-gray-50/30 border-gray-200/30 hover:bg-gray-100/60 hover:border-gray-300/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 min-w-0 pr-1.5"
                        onClick={() => {
                          if (item.visibility === "private") {
                            window.open(`${API_BASE}/preview-private/${item.cid}`, '_blank');
                          } else {
                            handleCidClick(item.cid, item.fileType);
                          }
                        }}
                      >
                        <div className="flex items-center space-x-1.5 mb-1">
                          <CloudArrowUpSolidIcon className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <p className="text-xs font-medium truncate">{item.fileName || 'Untitled'}</p>
                          {item.visibility === "private" && (
                            <EyeSlashIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs font-mono text-blue-600 dark:text-blue-400 truncate">
                          {item.cid}
                        </p>
                        <div className="flex items-center space-x-1.5 mt-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatSize(item.fileSize || 0)}
                          </p>
                          <span className="text-xs text-gray-400">•</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.fileType?.split('/')[0] || 'file'}
                          </p>
                          <span className="text-xs text-gray-400">•</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.visibility}
                          </p>
                        </div>
                        {item.timestamp && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddToGroupModal(item.cid);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/40 transition-all duration-200"
                          title="Add to Group"
                        >
                          <FolderIcon className="w-3.5 h-3.5 text-green-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCidAnalytics(item.cid);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200"
                          title="View Analytics"
                        >
                          <ChartBarIcon className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteUpload(item.cid);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200"
                        >
                          <TrashIcon className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Groups Section */}
            {activeSection === 'groups' && (
              <div className="space-y-4">
                {/* Create Group Button */}
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className={`w-full p-3 rounded-lg border-2 border-dashed transition-all duration-200 hover:scale-[1.02] ${
                    darkMode 
                      ? 'border-gray-600 hover:border-gray-500 bg-gray-700/20 hover:bg-gray-700/40 text-gray-300' 
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50/30 hover:bg-gray-100/60 text-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <PlusIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Create New Group</span>
                  </div>
                </button>

                <div className="space-y-1.5">
                  {groups.length === 0 && (
                    <div className="text-center py-8">
                      <FolderIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">No groups</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Create groups to organize your CIDs
                      </p>
                    </div>
                  )}
                  {groups.map((group, index) => (
                    <div
                      key={group.id}
                      className={`group p-2.5 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm ${
                        darkMode 
                          ? 'bg-gray-700/20 border-gray-600/30 hover:bg-gray-700/40 hover:border-gray-600/50' 
                          : 'bg-gray-50/30 border-gray-200/30 hover:bg-gray-100/60 hover:border-gray-300/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex-1 min-w-0 pr-1.5"
                          onClick={() => {
                            setSelectedGroup(group);
                            setShowGroupModal(true);
                          }}
                        >
                          <div className="flex items-center space-x-1.5 mb-1">
                            <FolderSolidIcon className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            <p className="text-xs font-medium truncate">{group.name}</p>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {group.cid_count} CID{group.cid_count !== 1 ? 's' : ''}
                            </p>
                            <span className="text-xs text-gray-400">•</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(group.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddCidModal(group.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/40 transition-all duration-200"
                            title="Add CID to Group"
                          >
                            <PlusIcon className="w-3.5 h-3.5 text-green-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setGroupToRename(group);
                              setRenameGroupName(group.name);
                              setShowRenameGroupModal(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200"
                            title="Rename Group"
                          >
                            <PencilIcon className="w-3.5 h-3.5 text-blue-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGroup(group.id, group.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200"
                            title="Delete Group"
                          >
                            <TrashIcon className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Section */}
            {activeSection === 'analytics' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <select
                    value={selectedAnalyticsPeriod}
                    onChange={(e) => {
                      const period = parseInt(e.target.value);
                      setSelectedAnalyticsPeriod(period);
                      fetchAnalyticsDashboard(period);
                    }}
                    className={`text-xs px-2 py-1 rounded-md border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => exportAnalytics('views', selectedAnalyticsPeriod)}
                      className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title="Export Views (Uploaded Content Only)"
                    >
                      <ArrowDownTrayIcon className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className={`p-2 rounded-lg text-xs ${
                  darkMode ? 'bg-blue-900/20 text-blue-300 border border-blue-800/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  📊 Analytics shown for uploaded content only
                </div>

                {realtimeAnalytics && (
                  <div className={`p-3 rounded-lg border ${
                    darkMode ? 'bg-gray-700/20 border-gray-600/30' : 'bg-blue-50/30 border-blue-200/30'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <h3 className="text-sm font-medium">Live Stats (Last Hour)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Views</p>
                        <p className="font-semibold text-blue-500">{realtimeAnalytics.recent_views}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Downloads</p>
                        <p className="font-semibold text-green-500">{realtimeAnalytics.recent_downloads}</p>
                      </div>
                    </div>
                    {realtimeAnalytics.active_sessions > 0 && (
                      <div className="mt-2 text-xs">
                        <p className="text-gray-500 dark:text-gray-400">
                          Active Sessions: <span className="font-semibold">{realtimeAnalytics.active_sessions}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {analytics && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className={`p-2.5 rounded-lg text-center ${
                        darkMode ? 'bg-gray-700/30' : 'bg-gray-100/30'
                      }`}>
                        <EyeIcon className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                        <p className="text-xs font-semibold">{formatNumber(analytics.totals?.views || 0)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Views</p>
                      </div>
                      <div className={`p-2.5 rounded-lg text-center ${
                        darkMode ? 'bg-gray-700/30' : 'bg-gray-100/30'
                      }`}>
                        <ArrowDownTrayIcon className="w-4 h-4 mx-auto mb-1 text-green-500" />
                        <p className="text-xs font-semibold">{formatNumber(analytics.totals?.downloads || 0)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Downloads</p>
                      </div>
                      <div className={`p-2.5 rounded-lg text-center ${
                        darkMode ? 'bg-gray-700/30' : 'bg-gray-100/30'
                      }`}>
                        <GlobeAltIcon className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                        <p className="text-xs font-semibold">{analytics.totals?.unique_cids || 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Unique Files</p>
                      </div>
                    </div>

                    {analytics.top_viewed && analytics.top_viewed.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <ArrowTrendingUpIcon className="w-4 h-4 mr-1 text-blue-500" />
                          Top Viewed Files
                        </h4>
                        <div className="space-y-1.5">
                          {analytics.top_viewed.slice(0, 5).map((item, index) => (
                            <div
                              key={index}
                              className={`p-2 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${
                                darkMode 
                                  ? 'bg-gray-700/20 border-gray-600/30 hover:bg-gray-700/40' 
                                  : 'bg-gray-50/30 border-gray-200/30 hover:bg-gray-100/60'
                              }`}
                              onClick={() => openCidAnalytics(item.cid)}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                                    {item.filename || 'Unknown File'}
                                  </p>
                                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400 truncate">
                                    {item.cid.substring(0, 20)}...
                                  </p>
                                </div>
                                <div className="flex items-center space-x-1 ml-2">
                                  <EyeIcon className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs font-semibold">{item.views}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analytics.top_downloaded && analytics.top_downloaded.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <ArrowDownTrayIcon className="w-4 h-4 mr-1 text-green-500" />
                          Top Downloaded Files
                        </h4>
                        <div className="space-y-1.5">
                          {analytics.top_downloaded.slice(0, 5).map((item, index) => (
                            <div
                              key={index}
                              className={`p-2 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${
                                darkMode 
                                  ? 'bg-gray-700/20 border-gray-600/30 hover:bg-gray-700/40' 
                                  : 'bg-gray-50/30 border-gray-200/30 hover:bg-gray-100/60'
                              }`}
                              onClick={() => openCidAnalytics(item.cid)}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                                    {item.filename || 'Unknown File'}
                                  </p>
                                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400 truncate">
                                    {item.cid.substring(0, 20)}...
                                  </p>
                                </div>
                                <div className="flex items-center space-x-1 ml-2">
                                  <ArrowDownTrayIcon className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs font-semibold">{item.downloads}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analytics.traffic_sources && analytics.traffic_sources.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <UserGroupIcon className="w-4 h-4 mr-1 text-green-500" />
                          Traffic Sources
                        </h4>
                        <div className="space-y-1">
                          {analytics.traffic_sources.map((source, index) => (
                            <div key={index} className="flex justify-between items-center text-xs">
                              <span className="capitalize">{source.source}</span>
                              <span className="font-semibold">{source.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analytics.gateway_usage && analytics.gateway_usage.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <GlobeAltIcon className="w-4 h-4 mr-1 text-purple-500" />
                          Gateway Usage
                        </h4>
                        <div className="space-y-1">
                          {analytics.gateway_usage.map((gateway, index) => (
                            <div key={index} className="flex justify-between items-center text-xs">
                              <span className="truncate">{gateway.gateway.replace('https://', '').replace('http://', '')}</span>
                              <span className="font-semibold">{gateway.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!analytics && (
                  <div className="text-center py-8">
                    <ChartBarIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Loading analytics...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-40">
        <div className="w-full max-w-2xl text-center mt-[-40px] mb-6">
          <h1 className="text-6xl font-bold font-pixelify text-gray-500">Silver</h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Search On Web3</p>
        </div>

        <div className="w-full max-w-2xl space-y-6">
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter IPFS CID..."
              className={`w-full pl-12 pr-28 py-4 rounded-2xl text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 ${
                darkMode 
                  ? 'bg-gray-800/80 border border-gray-700/50 text-white backdrop-blur-sm focus:bg-gray-800' 
                  : 'bg-white/80 border border-gray-300/50 text-gray-800 backdrop-blur-sm focus:bg-white'
              }`}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-3">
              <button 
                type="button" 
                onClick={() => setShowUploadOptions(true)}
                className="hover:scale-110 transition-transform duration-200"
              >
                <ArrowUpTrayIcon className="w-5 h-5 text-blue-500" />
              </button>
              <button 
                type="submit"
                className="hover:scale-110 transition-transform duration-200"
              >
                <MagnifyingGlassIcon className="w-5 h-5 text-blue-500" />
              </button>
            </div>
          </form>

          {uploading && (
            <div className="flex justify-center items-center space-x-2 text-blue-500">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" />
              </svg>
              <p>
                {folderUploadProgress ? 
                  `Uploading folder... (${folderUploadProgress.current}/${folderUploadProgress.total})` : 
                  'Uploading to IPFS...'
                }
              </p>
            </div>
          )}

          {folderUploadProgress && (
            <div className={`p-4 rounded-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center space-x-3 mb-2">
                <FolderArrowDownIcon className="w-5 h-5 text-blue-500" />
                <h3 className="font-medium">Folder Upload Progress</h3>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(folderUploadProgress.current / folderUploadProgress.total) * 100}%` }}
                ></div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {folderUploadProgress.current}/{folderUploadProgress.total} files processed
              </p>
              
              {folderUploadProgress.status === 'completed' && folderUploadProgress.folderCid && (
                <div className="mt-2">
                  <p className="text-sm text-green-600 dark:text-green-400">✅ Folder uploaded successfully!</p>
                  <a 
                    href={`/search?q=${folderUploadProgress.folderCid}`} 
                    className="text-blue-500 hover:underline text-sm break-all"
                  >
                    {folderUploadProgress.folderCid}
                  </a>
                </div>
              )}
              
              {folderUploadProgress.status === 'error' && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  ❌ Error: {folderUploadProgress.error}
                </p>
              )}
            </div>
          )}

          {uploadedCid && (
            <div className="text-center mt-2">
              <p className="text-sm text-green-500">✅ Uploaded!</p>
              {visibility === "private" ? (
                <a
                  href={`${API_BASE}/preview-private/${uploadedCid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline break-all text-sm"
                >
                  Preview Private CID
                </a>
              ) : (
                <a href={`/search?q=${uploadedCid}`} className="text-blue-500 hover:underline break-all text-sm">
                  {uploadedCid}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* All Modals - Wrapped in ErrorBoundary */}
      <ErrorBoundary>
        {/* Upload Modal */}
        {showUploadOptions && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`relative rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all duration-300 scale-100 border ${
              darkMode 
                ? 'bg-gray-800/95 border-gray-700/50 backdrop-blur-xl' 
                : 'bg-white/95 border-gray-200/50 backdrop-blur-xl'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-xl ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <CloudArrowUpIcon className={`w-6 h-6 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Upload to IPFS</h2>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Choose what to upload
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadOptions(false)}
                  className={`p-1.5 rounded-lg transition-all duration-200 hover:rotate-90 ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Upload Type Selection */}
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => setUploadType('file')}
                    className={`p-3 rounded-lg border transition-all ${
                      uploadType === 'file'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : darkMode 
                        ? 'border-gray-600 bg-gray-700/50' 
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <DocumentIcon className="w-6 h-6 mx-auto mb-1" />
                    <p className="text-sm font-medium">File</p>
                  </button>
                  
                  <button
                    onClick={() => setUploadType('folder')}
                    className={`p-3 rounded-lg border transition-all ${
                      uploadType === 'folder'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : darkMode 
                        ? 'border-gray-600 bg-gray-700/50' 
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <FolderIcon className="w-6 h-6 mx-auto mb-1" />
                    <p className="text-sm font-medium">Folder</p>
                  </button>
                </div>

                {/* Visibility Options */}
                <button
                  className={`w-full p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] transform ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                  onClick={() => {
                    setVisibility('public');
                    setPendingVisibility('public');
                    if (uploadType === 'file') {
                      document.getElementById('hidden-upload-input').click();
                    } else {
                      document.getElementById('hidden-folder-input').click();
                    }
                    setShowUploadOptions(false);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      darkMode ? 'bg-gray-600' : 'bg-gray-200'
                    }`}>
                      <EyeIcon className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold">Public Upload</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Anyone can access
                      </div>
                    </div>
                    <div className="text-lg">🌐</div>
                  </div>
                </button>

                <button
                  className={`w-full p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] transform ${
                    darkMode 
                      ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                  onClick={() => {
                    setVisibility('private');
                    setPendingVisibility('private');
                    if (uploadType === 'file') {
                      document.getElementById('hidden-upload-input').click();
                    } else {
                      document.getElementById('hidden-folder-input').click();
                    }
                    setShowUploadOptions(false);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      darkMode ? 'bg-gray-500' : 'bg-gray-300'
                    }`}>
                      <EyeSlashIcon className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold">Private Upload</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Only you can access
                      </div>
                    </div>
                    <div className="text-lg">🔒</div>
                  </div>
                </button>
              </div>

              <div className={`text-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {uploadType === 'file' ? 'Select a file' : 'Select a folder'} to upload to IPFS
              </div>
            </div>
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateGroupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`relative rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all duration-300 scale-100 border ${
              darkMode 
                ? 'bg-gray-800/95 border-gray-700/50 backdrop-blur-xl' 
                : 'bg-white/95 border-gray-200/50 backdrop-blur-xl'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-xl ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <FolderIcon className={`w-6 h-6 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Create New Group</h2>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Enter a name for your group
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateGroupModal(false);
                    setNewGroupName('');
                  }}
                  className={`p-1.5 rounded-lg transition-all duration-200 hover:rotate-90 ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      createGroup();
                    }
                  }}
                />

                <div className="flex space-x-3">
                  <button
                    onClick={createGroup}
                    disabled={!newGroupName.trim()}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      !newGroupName.trim()
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transform hover:scale-[1.02]'
                    }`}
                  >
                    Create Group
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateGroupModal(false);
                      setNewGroupName('');
                    }}
                    className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Group Details Modal */}
        {showGroupModal && selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`relative rounded-2xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 border ${
              darkMode 
                ? 'bg-gray-800/95 border-gray-700/50 backdrop-blur-xl' 
                : 'bg-white/95 border-gray-200/50 backdrop-blur-xl'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <FolderSolidIcon className="w-6 h-6 text-blue-500" />
                  <div>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedGroup.name}
                    </h2>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selectedGroup.cid_count} CID{selectedGroup.cid_count !== 1 ? 's' : ''} • Created {new Date(selectedGroup.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openAddCidModal(selectedGroup.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      darkMode 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                    title="Add CID to Group"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setShowGroupModal(false);
                      setSelectedGroup(null);
                    }}
                    className={`p-1.5 rounded-lg transition-all duration-200 hover:rotate-90 ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {selectedGroup.cids && selectedGroup.cids.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-base text-gray-500 dark:text-gray-400 mb-2">No CIDs in this group</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                      Add CIDs by clicking the + button above or using the folder button in other sections
                    </p>
                    <button
                      onClick={() => openAddCidModal(selectedGroup.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add First CID
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedGroup.cids && selectedGroup.cids.map((cidItem, index) => (
                      <div
                        key={index}
                        className={`group p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.02] ${
                          darkMode 
                            ? 'bg-gray-700/20 border-gray-600/30 hover:bg-gray-700/40 hover:border-gray-600/50' 
                            : 'bg-gray-50/30 border-gray-200/30 hover:bg-gray-100/60 hover:border-gray-300/50'
                        }`}
                        onClick={() => handleCidClick(cidItem.cid, cidItem.fileType)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${
                            darkMode ? 'bg-gray-600/50' : 'bg-gray-200/50'
                          }`}>
                            {getFileTypeIcon(cidItem.fileType, 'w-5 h-5 text-gray-600 dark:text-gray-300')}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-medium truncate text-gray-800 dark:text-white">
                                {cidItem.fileName || `File_${cidItem.cid.substring(0, 8)}`}
                              </p>
                              {cidItem.fileSize > 0 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">
                                  {formatSize(cidItem.fileSize)}
                                </span>
                              )}
                            </div>
                            
                            <p className="text-xs font-mono text-blue-600 dark:text-blue-400 truncate mb-2 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 bg-blue-50 dark:bg-blue-900/20">
                              {cidItem.cid}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Added {new Date(cidItem.added_at).toLocaleDateString()}
                                </p>
                                {cidItem.fileType && (
                                  <>
                                    <span className="text-xs text-gray-400">•</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                      {cidItem.fileType.split('/')[0]}
                                    </p>
                                  </>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isCidUploaded(cidItem.cid) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openCidAnalytics(cidItem.cid);
                                    }}
                                    className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200"
                                    title="View Analytics"
                                  >
                                    <ChartBarIcon className="w-4 h-4 text-blue-500" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeCidFromGroup(selectedGroup.id, cidItem.cid);
                                  }}
                                  className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200"
                                  title="Remove from Group"
                                >
                                  <TrashIcon className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add to Group Modal */}
        {showAddToGroupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`relative rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all duration-300 scale-100 border ${
              darkMode 
                ? 'bg-gray-800/95 border-gray-700/50 backdrop-blur-xl' 
                : 'bg-white/95 border-gray-200/50 backdrop-blur-xl'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-xl ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <FolderIcon className={`w-6 h-6 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Add to Group</h2>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-mono truncate max-w-[200px]`}>
                      {selectedCidForGroup}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddToGroupModal(false);
                    setSelectedCidForGroup('');
                  }}
                  className={`p-1.5 rounded-lg transition-all duration-200 hover:rotate-90 ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                {groups.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No groups available</p>
                    <button
                      onClick={() => {
                        setShowAddToGroupModal(false);
                        setShowCreateGroupModal(true);
                      }}
                      className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create First Group
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Select a group to add this CID to:
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {groups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => addCidToGroup(group.id, selectedCidForGroup)}
                          className={`w-full p-3 rounded-lg border transition-all duration-200 hover:shadow-sm text-left ${
                            darkMode 
                              ? 'bg-gray-700/20 border-gray-600/30 hover:bg-gray-700/40 hover:border-gray-600/50' 
                              : 'bg-gray-50/30 border-gray-200/30 hover:bg-gray-100/60 hover:border-gray-300/50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <FolderSolidIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{group.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {group.cid_count} CID{group.cid_count !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Manual CID to Group Modal */}
        {showAddCidModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`relative rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all duration-300 scale-100 border ${
              darkMode 
                ? 'bg-gray-800/95 border-gray-700/50 backdrop-blur-xl' 
                : 'bg-white/95 border-gray-200/50 backdrop-blur-xl'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-xl ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <PlusIcon className={`w-6 h-6 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Add CID to Group</h2>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Enter a CID to add to this group
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddCidModal(false);
                    setManualCid('');
                    setTargetGroupId(null);
                  }}
                  className={`p-1.5 rounded-lg transition-all duration-200 hover:rotate-90 ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    IPFS CID
                  </label>
                  <input
                    type="text"
                    value={manualCid}
                    onChange={(e) => setManualCid(e.target.value)}
                    placeholder="Qm... or baf..."
                    className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 font-mono ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addManualCidToGroup();
                      }
                    }}
                  />
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Enter a valid IPFS CID (starts with Qm or baf)
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={addManualCidToGroup}
                    disabled={!manualCid.trim()}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      !manualCid.trim()
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transform hover:scale-[1.02]'
                    }`}
                  >
                    Add to Group
                  </button>
                  <button
                    onClick={() => {
                      setShowAddCidModal(false);
                      setManualCid('');
                      setTargetGroupId(null);
                    }}
                    className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rename Group Modal */}
        {showRenameGroupModal && groupToRename && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`relative rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all duration-300 scale-100 border ${
              darkMode 
                ? 'bg-gray-800/95 border-gray-700/50 backdrop-blur-xl' 
                : 'bg-white/95 border-gray-200/50 backdrop-blur-xl'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-xl ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <PencilIcon className={`w-6 h-6 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Rename Group</h2>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Current name: {groupToRename.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowRenameGroupModal(false);
                    setGroupToRename(null);
                    setRenameGroupName('');
                  }}
                  className={`p-1.5 rounded-lg transition-all duration-200 hover:rotate-90 ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  value={renameGroupName}
                  onChange={(e) => setRenameGroupName(e.target.value)}
                  placeholder="Enter new group name..."
                  className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameGroup();
                    }
                  }}
                />

                <div className="flex space-x-3">
                  <button
                    onClick={renameGroup}
                    disabled={!renameGroupName.trim() || renameGroupName.trim() === groupToRename?.name}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      !renameGroupName.trim() || renameGroupName.trim() === groupToRename?.name
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transform hover:scale-[1.02]'
                    }`}
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      setShowRenameGroupModal(false);
                      setGroupToRename(null);
                      setRenameGroupName('');
                    }}
                    className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CID Analytics Modal */}
        {showAnalyticsModal && selectedCidForAnalytics && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`relative rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 border ${
              darkMode 
                ? 'bg-gray-800/95 border-gray-700/50 backdrop-blur-xl' 
                : 'bg-white/95 border-gray-200/50 backdrop-blur-xl'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <ChartBarIcon className="w-6 h-6 text-blue-500" />
                  <div>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>CID Analytics</h2>
                    <p className={`text-xs font-mono ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selectedCidForAnalytics.substring(0, 30)}...
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAnalyticsModal(false);
                    setSelectedCidForAnalytics(null);
                    setAnalyticsError(null);
                  }}
                  className={`p-1.5 rounded-lg transition-all duration-200 hover:rotate-90 ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Error state */}
              {analyticsError && (
                <div className="text-center py-8">
                  <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-3 text-red-500" />
                  <p className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">Error Loading Analytics</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {analyticsError}
                  </p>
                  <button
                    onClick={() => {
                      setAnalyticsError(null);
                      fetchCidAnalytics(selectedCidForAnalytics, 7);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

                           {/* Loading state */}
              {!analyticsError && !cidAnalytics[selectedCidForAnalytics] && (
                <div className="text-center py-8">
                  <ChartBarIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600 animate-pulse" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Loading analytics...</p>
                </div>
              )}

              {/* Analytics Content */}
              {!analyticsError && cidAnalytics[selectedCidForAnalytics] && !cidAnalytics[selectedCidForAnalytics].error && (
                <div className="space-y-6">
                  {/* File Info */}
                  <div className={`p-4 rounded-lg ${
                    darkMode ? 'bg-gray-700/20' : 'bg-gray-50/30'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <DocumentIcon className="w-5 h-5 text-blue-500" />
                      <h3 className="font-medium">{cidAnalytics[selectedCidForAnalytics].filename}</h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Analytics for the last 7 days
                    </p>
                  </div>

                  {/* Analytics Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700/20 border-gray-600/30' 
                        : 'bg-gray-50/30 border-gray-200/30'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <EyeIcon className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Views</span>
                      </div>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">
                        {formatNumber(cidAnalytics[selectedCidForAnalytics].total_views || 0)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Last 7 days
                      </p>
                    </div>

                    <div className={`p-4 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700/20 border-gray-600/30' 
                        : 'bg-gray-50/30 border-gray-200/30'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <ArrowDownTrayIcon className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Downloads</span>
                      </div>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">
                        {formatNumber(cidAnalytics[selectedCidForAnalytics].total_downloads || 0)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Last 7 days
                      </p>
                    </div>

                    <div className={`p-4 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700/20 border-gray-600/30' 
                        : 'bg-gray-50/30 border-gray-200/30'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <UserGroupIcon className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Unique Users</span>
                      </div>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">
                        {formatNumber(cidAnalytics[selectedCidForAnalytics].unique_users || 0)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Last 7 days
                      </p>
                    </div>

                    <div className={`p-4 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700/20 border-gray-600/30' 
                        : 'bg-gray-50/30 border-gray-200/30'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <ArrowTrendingUpIcon className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Peak Day</span>
                      </div>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">
                        {cidAnalytics[selectedCidForAnalytics].peak_day_views || 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {cidAnalytics[selectedCidForAnalytics].peak_day || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Traffic Sources */}
                  {cidAnalytics[selectedCidForAnalytics].traffic_sources && 
                   cidAnalytics[selectedCidForAnalytics].traffic_sources.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center">
                        <UserGroupIcon className="w-4 h-4 mr-2 text-purple-500" />
                        Traffic Sources
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {cidAnalytics[selectedCidForAnalytics].traffic_sources.map((source, index) => (
                          <div key={index} className={`p-3 rounded-lg border ${
                            darkMode 
                              ? 'bg-gray-700/10 border-gray-600/20' 
                              : 'bg-gray-50/20 border-gray-200/20'
                          }`}>
                            <div className="flex justify-between items-center">
                              <span className="text-sm capitalize text-gray-700 dark:text-gray-300">
                                {source.source_type}
                              </span>
                              <span className="text-sm font-semibold text-gray-800 dark:text-white">
                                {source.count}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Activity */}
                  {cidAnalytics[selectedCidForAnalytics].recent_activity && 
                   cidAnalytics[selectedCidForAnalytics].recent_activity.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2 text-green-500" />
                        Recent Activity
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {cidAnalytics[selectedCidForAnalytics].recent_activity.slice(0, 10).map((activity, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg border flex items-center justify-between ${
                              darkMode 
                                ? 'bg-gray-700/10 border-gray-600/20' 
                                : 'bg-gray-50/20 border-gray-200/20'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              {activity.action === 'view' ? (
                                <EyeIcon className="w-4 h-4 text-blue-500" />
                              ) : (
                                <ArrowDownTrayIcon className="w-4 h-4 text-green-500" />
                              )}
                              <div>
                                <p className="text-xs font-medium text-gray-800 dark:text-white capitalize">
                                  {activity.action}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                  {activity.user_agent ? 
                                    activity.user_agent.substring(0, 40) + (activity.user_agent.length > 40 ? '...' : '') 
                                    : 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Export Button */}
                  <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => exportAnalytics('views', 7)}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span>Export Data</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Error state for analytics data */}
              {!analyticsError && cidAnalytics[selectedCidForAnalytics]?.error && (
                <div className="text-center py-8">
                  <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-3 text-orange-500" />
                  <p className="text-lg font-medium text-orange-600 dark:text-orange-400 mb-2">
                    Analytics Not Available
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {cidAnalytics[selectedCidForAnalytics].error}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Analytics are only available for content you've uploaded
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </ErrorBoundary>

      {/* Hidden file inputs for uploads */}
      <input
        id="hidden-upload-input"
        type="file"
        className="hidden"
        onChange={handleFileUpload}
        accept="*/*"
      />
      
      {/* Hidden folder input */}
      <input
        id="hidden-folder-input"
        type="file"
        className="hidden"
        onChange={handleFileUpload}
        webkitdirectory=""
        directory=""
        multiple
      />
    </div>
  );
};

export default NexusBrowser;

