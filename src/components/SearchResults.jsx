import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Search from './Search';
import { 
  TrashIcon,
  ClockIcon,
  ShareIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  BookmarkIcon,
  BookmarkSlashIcon,
  CloudArrowUpIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  PencilIcon,
  DocumentIcon,
  FolderIcon,
  PlusIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  DocumentTextIcon,
  ArrowsPointingOutIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
  FunnelIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import {
  BookmarkIcon as BookmarkSolidIcon,
  ClockIcon as ClockSolidIcon,
  CloudArrowUpIcon as CloudArrowUpSolidIcon,
  ChartBarIcon as ChartBarSolidIcon,
  FolderIcon as FolderSolidIcon,
  FolderOpenIcon as FolderOpenSolidIcon,
} from '@heroicons/react/24/solid';

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

const API_BASE = "https://silver-dec-v4-ubdd.onrender.com";

const SearchResults = ({ darkMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get('q') || '';
  const [meta, setMeta] = useState(null);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Enhanced folder navigation states
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState([]);
  const [folderSearchTerm, setFolderSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'size', 'type', 'date'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [showFolderInfo, setShowFolderInfo] = useState(false);

  // Custom filename download states
  const [showFilenameModal, setShowFilenameModal] = useState(false);
  const [customFilename, setCustomFilename] = useState('');
  const [downloadCid, setDownloadCid] = useState('');
  const [suggestedFilename, setSuggestedFilename] = useState('');

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [realtimeAnalytics, setRealtimeAnalytics] = useState(null);
  const [cidAnalytics, setCidAnalytics] = useState({});
  const [selectedAnalyticsPeriod, setSelectedAnalyticsPeriod] = useState(30);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedCidForAnalytics, setSelectedCidForAnalytics] = useState(null);

  // Group management state
  const [groups, setGroups] = useState([]);
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupsLoading, setGroupsLoading] = useState(false);
  
  // Group detail modal states
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAddCidModal, setShowAddCidModal] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState(null);
  const [manualCid, setManualCid] = useState('');
  const [showRenameGroupModal, setShowRenameGroupModal] = useState(false);
  const [groupToRename, setGroupToRename] = useState(null);
  const [renameGroupName, setRenameGroupName] = useState('');

  // Mobile-specific states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('history');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Fullscreen preview state
  const [fullscreen, setFullscreen] = useState({
    open: false,
    type: '',
    url: '',
    text: '',
  });

  const currentUrl = window.location.href;
  const savedCids = useRef(new Set());

  // Mobile detection and resize handler
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [sidebarOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  // Enhanced folder navigation functions
  const buildPathBreadcrumbs = () => {
    if (!currentPath) return [{ name: 'Root', path: '', isRoot: true }];
    
    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Root', path: '', isRoot: true }];
    
    let fullPath = '';
    parts.forEach((part, index) => {
      fullPath += `/${part}`;
      breadcrumbs.push({ 
        name: decodeURIComponent(part), 
        path: fullPath.substring(1),
        isRoot: false 
      });
    });
    
    return breadcrumbs;
  };

  const navigateToFolder = (folderName) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
    setPathHistory(prev => [...prev, currentPath]);
    
    const fullCid = `${query}/${newPath}`;
    navigate(`/search?q=${encodeURIComponent(fullCid)}`);
  };

  const navigateUp = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory.pop();
      setCurrentPath(previousPath);
      setPathHistory([...pathHistory]);
      
      const fullCid = previousPath ? `${query}/${previousPath}` : query;
      navigate(`/search?q=${encodeURIComponent(fullCid)}`);
    } else if (currentPath) {
      const pathParts = currentPath.split('/');
      pathParts.pop();
      const newPath = pathParts.join('/');
      setCurrentPath(newPath);
      
      const fullCid = newPath ? `${query}/${newPath}` : query;
      navigate(`/search?q=${encodeURIComponent(fullCid)}`);
    }
  };

  const navigateToBreadcrumb = (path) => {
    setCurrentPath(path);
    setPathHistory([]);
    
    const fullCid = path ? `${query}/${path}` : query;
    navigate(`/search?q=${encodeURIComponent(fullCid)}`);
  };

  // Enhanced file type detection
  const getFileTypeInfo = (item) => {
    if (item.isDir) {
      return {
        type: 'folder',
        icon: FolderIcon,
        color: 'text-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        category: 'folder'
      };
    }

    const name = item.name?.toLowerCase() || '';
    const ext = name.split('.').pop();
    
    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext)) {
      return {
        type: 'image',
        icon: PhotoIcon,
        color: 'text-green-500',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        category: 'image'
      };
    }
    
    // Video files
    if (['mp4', 'webm', 'avi', 'mov', 'mkv', 'wmv', 'flv', '3gp'].includes(ext)) {
      return {
        type: 'video',
        icon: FilmIcon,
        color: 'text-purple-500',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        category: 'video'
      };
    }
    
    // Audio files
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a'].includes(ext)) {
      return {
        type: 'audio',
        icon: MusicalNoteIcon,
        color: 'text-pink-500',
        bgColor: 'bg-pink-100 dark:bg-pink-900/30',
        category: 'audio'
      };
    }
    
    // Document files
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      return {
        type: 'document',
        icon: DocumentIcon,
        color: 'text-red-500',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        category: 'document'
      };
    }
    
    // Text files
    if (['txt', 'md', 'json', 'xml', 'csv', 'log', 'rtf'].includes(ext)) {
      return {
        type: 'text',
        icon: DocumentTextIcon,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        category: 'text'
      };
    }
    
    // Default
    return {
      type: 'file',
      icon: DocumentIcon,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100 dark:bg-gray-700/30',
      category: 'other'
    };
  };

  // Filter and sort entries
  useEffect(() => {
    let filtered = entries.filter(item => {
      // Hide hidden files if not showing them
      if (!showHiddenFiles && item.name?.startsWith('.')) return false;
      
      // Apply search filter
      if (folderSearchTerm) {
        return item.name?.toLowerCase().includes(folderSearchTerm.toLowerCase());
      }
      
      return true;
    });

    // Sort entries
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      // Always put directories first unless sorting by type
      if (sortBy !== 'type') {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
      }
      
      switch (sortBy) {
        case 'size':
          aVal = a.size || 0;
          bVal = b.size || 0;
          break;
        case 'type':
          aVal = a.isDir ? 'folder' : getFileTypeInfo(a).category;
          bVal = b.isDir ? 'folder' : getFileTypeInfo(b).category;
          break;
        case 'date':
          aVal = new Date(a.modified || a.created || 0).getTime();
          bVal = new Date(b.modified || b.created || 0).getTime();
          break;
        default: // name
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    setFilteredEntries(filtered);
  }, [entries, folderSearchTerm, sortBy, sortOrder, showHiddenFiles]);

  // Calculate folder statistics
  const getFolderStats = () => {
    if (!entries.length) return null;
    
    const folders = entries.filter(item => item.isDir);
    const files = entries.filter(item => !item.isDir);
    const totalSize = files.reduce((acc, file) => acc + (file.size || 0), 0);
    const hiddenItems = entries.filter(item => item.name?.startsWith('.')).length;
    
    return {
      folders: folders.length,
      files: files.length,
      totalSize,
      hiddenItems,
      totalItems: entries.length
    };
  }

  // Enhanced folder item component with mobile responsiveness
  const FolderItem = ({ item, index }) => {
    const isSelected = selectedItems.has(item.name);
    const fileInfo = getFileTypeInfo(item);
    const IconComponent = fileInfo.icon;
    
    const handleItemClick = () => {
      const queryParts = query.split('/');
      const baseCid = queryParts[0];
      
      if (item.isDir) {
        navigateToFolder(item.name);
      } else {
        let fullPath = baseCid;
        
        if (currentPath) {
          fullPath += '/' + currentPath;
        }
        
        fullPath += '/' + item.name;
        
        navigate(`/search?q=${encodeURIComponent(fullPath)}`);
      }
    };

    const handleItemSelect = (e) => {
      e.stopPropagation();
      const newSelected = new Set(selectedItems);
      if (isSelected) {
        newSelected.delete(item.name);
      } else {
        newSelected.add(item.name);
      }
      setSelectedItems(newSelected);
    };

    // Get proper file size display with priority handling
    const getDisplaySize = () => {
      if (item.isDir) {
        // For directories, show "Folder" or item count if available
        if (item.item_count !== undefined) {
          const count = item.item_count;
          return `${count} item${count !== 1 ? 's' : ''}`;
        }
        return 'Folder';
      }
      
      // For files, use multiple fallback methods
      // 1. First try backend-provided human readable size
      if (item.size_human && item.size_human !== '0 B') {
        return item.size_human;
      }
      
      // 2. Then try to format the raw size
      if (item.size && item.size > 0) {
        return formatSize(item.size);
      }
      
      // 3. Check if it's in the meta data
      if (item.fileSize && item.fileSize > 0) {
        return formatSize(item.fileSize);
      }
      
      // 4. Default fallback
      return item.isDir ? 'Folder' : 'Unknown size';
    };

    // Mobile-responsive list view
    if (viewMode === 'list') {
      return (
        <div
          key={item.name}
          className={`group flex items-center p-3 sm:p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
            isSelected 
              ? darkMode 
                ? 'bg-blue-600/20 border-blue-500/50 shadow-lg' 
                : 'bg-blue-50 border-blue-300 shadow-lg'
              : darkMode 
                ? 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-700/60 hover:border-gray-600/70' 
                : 'bg-white/80 border-gray-200/50 hover:bg-gray-50 hover:border-gray-300'
          }`}
          onClick={handleItemClick}
        >
          {/* Mobile: Hide checkbox on small screens or make it smaller */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleItemSelect}
            className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2`}
            onClick={e => e.stopPropagation()}
          />
          
          <div className={`flex-shrink-0 mr-3 sm:mr-4 p-2 rounded-lg ${fileInfo.bgColor}`}>
            <IconComponent className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} ${fileInfo.color}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <p className={`font-medium truncate text-sm sm:text-base ${
                item.isDir ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
              }`}>
                {item.name}
              </p>
              {item.isDir && <ChevronRightIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />}
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium">{getDisplaySize()}</span>
              {!item.isDir && item.extension && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="uppercase text-xs font-mono hidden sm:inline">
                    {item.extension.replace('.', '')}
                  </span>
                </>
              )}
              {item.modified && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{new Date(item.modified).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Mobile: Show fewer action buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {!item.isDir && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const queryParts = query.split('/');
                  const baseCid = queryParts[0];
                  let fullPath = baseCid;
                  if (currentPath) {
                    fullPath += '/' + currentPath;
                  }
                  fullPath += '/' + item.name;
                  initiateCustomDownload(fullPath, item.name);
                }}
                className={`p-1.5 sm:p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors`}
                title="Download"
              >
                <ArrowDownTrayIcon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Add info modal or action here
              }}
              className="p-1.5 sm:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors"
              title="Info"
            >
              <InformationCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
            </button>
          </div>
        </div>
      );
    }

    // Mobile-responsive grid view
    return (
      <div
        key={item.name}
        className={`group relative p-3 sm:p-4 rounded-xl border transition-all duration-200 hover:shadow-lg cursor-pointer transform hover:scale-[1.02] ${
          isSelected 
            ? darkMode 
              ? 'bg-blue-600/20 border-blue-500/50 shadow-xl scale-[1.02]' 
              : 'bg-blue-50 border-blue-300 shadow-xl scale-[1.02]'
            : darkMode 
              ? 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/70 hover:border-gray-600/70' 
              : 'bg-white/90 border-gray-200/50 hover:bg-white hover:border-gray-300'
        }`}
        onClick={handleItemClick}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleItemSelect}
          className={`absolute top-2 left-2 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'} rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 z-10`}
          onClick={e => e.stopPropagation()}
        />
        
        <div className={`text-center ${isMobile ? 'pt-6' : 'pt-8'}`}>
          <div className="flex justify-center mb-2 sm:mb-3">
            <div className={`p-3 sm:p-4 rounded-2xl ${fileInfo.bgColor} transition-all duration-200 group-hover:scale-110`}>
              <IconComponent className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} ${fileInfo.color}`} />
            </div>
          </div>
          
          <h3 className={`font-medium text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-2 px-1 sm:px-2 ${
            item.isDir ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
          }`}>
            {item.name}
          </h3>
          
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p className="font-medium text-center">
              {getDisplaySize()}
            </p>
            {!item.isDir && item.extension && (
              <p className="uppercase font-mono text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded inline-block">
                {item.extension.replace('.', '')}
              </p>
            )}
            {item.modified && !isMobile && (
              <p className="text-xs">
                {new Date(item.modified).toLocaleDateString()}
              </p>
            )}
          </div>
          
          {!item.isDir && (
            <div className={`absolute ${isMobile ? 'top-2 right-2' : 'top-3 right-3'} opacity-0 group-hover:opacity-100 transition-opacity`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const queryParts = query.split('/');
                  const baseCid = queryParts[0];
                  let fullPath = baseCid;
                  if (currentPath) {
                    fullPath += '/' + currentPath;
                  }
                  fullPath += '/' + item.name;
                  initiateCustomDownload(fullPath, item.name);
                }}
                className={`p-1.5 sm:p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-lg border border-gray-200/50 dark:border-gray-700/50`}
                title="Download"
              >
                <ArrowDownTrayIcon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
              </button>
            </div>
          )}
          
          {item.isDir && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/20 to-transparent rounded-xl">
              <div className="bg-white/90 dark:bg-gray-800/90 rounded-full p-2 shadow-lg">
                <ChevronRightIcon className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-blue-600`} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Enhanced Folder Browser Component with mobile responsiveness
  const renderFolderBrowser = () => {
    if (!meta?.is_dir) return null;

    const breadcrumbs = buildPathBreadcrumbs();
    const totalSelected = selectedItems.size;
    const folderStats = getFolderStats();

    return (
      <div className={`space-y-4 sm:space-y-6 p-4 sm:p-6 rounded-xl border ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50' 
          : 'bg-gradient-to-br from-white/80 to-gray-50/80 border-gray-200/50'
      } backdrop-blur-sm shadow-lg`}>
        
        {/* Mobile-optimized header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className={`p-2 sm:p-3 rounded-xl ${
              darkMode ? 'bg-blue-600/20' : 'bg-blue-100'
            }`}>
              <FolderOpenIcon className={`${isMobile ? 'w-5 h-5' : 'w-7 h-7'} ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h3 className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Folder Contents
              </h3>
              {folderStats && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <span>{folderStats.files} file{folderStats.files !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{folderStats.folders} folder{folderStats.folders !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{formatSize(folderStats.totalSize)}</span>
                  {folderStats.hiddenItems > 0 && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">{folderStats.hiddenItems} hidden</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end space-x-2">
            {totalSelected > 0 && (
              <div className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium ${
                darkMode 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
                {totalSelected} selected
              </div>
            )}
            
            <button
              onClick={() => setShowFolderInfo(!showFolderInfo)}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                showFolderInfo
                  ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                  : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              title="Folder Info"
            >
              <InformationCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Folder Info Panel - Mobile optimized */}
        {showFolderInfo && folderStats && (
          <div className={`p-3 sm:p-4 rounded-lg border ${
            darkMode 
              ? 'bg-gray-800/50 border-gray-700/50' 
              : 'bg-gray-50/50 border-gray-200/50'
          }`}>
            <h4 className={`font-medium mb-3 text-sm sm:text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Folder Statistics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Total:</span>
                <span className="ml-1 sm:ml-2 font-medium">{folderStats.totalItems}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Files:</span>
                <span className="ml-1 sm:ml-2 font-medium">{folderStats.files}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Folders:</span>
                <span className="ml-1 sm:ml-2 font-medium">{folderStats.folders}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-gray-500 dark:text-gray-400">Size:</span>
                <span className="ml-1 sm:ml-2 font-medium">{formatSize(folderStats.totalSize)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile-optimized breadcrumb navigation */}
        <div className={`p-3 sm:p-4 rounded-lg border ${
          darkMode 
            ? 'bg-gray-800/30 border-gray-700/50' 
            : 'bg-white/60 border-gray-200/50'
        }`}>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h4 className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Location
            </h4>
            {currentPath && (
              <button
                onClick={navigateUp}
                className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Go up one level"
              >
                <ArrowUpIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Up</span>
              </button>
            )}
          </div>
          
          <nav className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm overflow-x-auto">
            <HomeIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRightIcon className="w-2 h-2 sm:w-3 sm:h-3 text-gray-400 flex-shrink-0" />}
                <button
                  onClick={() => navigateToBreadcrumb(crumb.path)}
                  className={`hover:underline transition-colors whitespace-nowrap truncate max-w-24 sm:max-w-none ${
                    index === breadcrumbs.length - 1
                      ? darkMode ? 'text-white font-medium' : 'text-gray-900 font-medium'
                      : darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                  title={crumb.name}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Mobile-responsive toolbar */}
        <div className="space-y-3 sm:space-y-4">
          {/* Search bar - full width on mobile */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files and folders..."
              value={folderSearchTerm}
              onChange={(e) => setFolderSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                darkMode 
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white/80 border-gray-300 text-gray-800 placeholder-gray-500'
              }`}
            />
            {folderSearchTerm && (
              <button
                onClick={() => setFolderSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <XMarkIcon className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Mobile-optimized controls */}
          <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:items-center">
            {/* Sort and filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`px-3 py-2 rounded-lg border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  darkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-white' 
                    : 'bg-white/80 border-gray-300 text-gray-800'
                }`}
              >
                <option value="name">Sort by Name</option>
                <option value="size">Sort by Size</option>
                <option value="type">Sort by Type</option>
                <option value="date">Sort by Date</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className={`p-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-600 text-white' 
                    : 'bg-white/80 border-gray-300 hover:bg-gray-100 text-gray-800'
                }`}
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowsUpDownIcon className={`w-4 h-4 transform transition-transform ${
                  sortOrder === 'desc' ? 'rotate-180' : ''
                }`} />
              </button>
              
              <button
                onClick={() => setShowHiddenFiles(!showHiddenFiles)}
                className={`p-2 rounded-lg border transition-colors ${
                  showHiddenFiles
                    ? darkMode 
                      ? 'bg-blue-600 border-blue-500 text-white' 
                      : 'bg-blue-500 border-blue-400 text-white'
                    : darkMode 
                      ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-600 text-white' 
                      : 'bg-white/80 border-gray-300 hover:bg-gray-100 text-gray-800'
                }`}
                title="Toggle Hidden Files"
              >
                <EyeSlashIcon className="w-4 h-4" />
              </button>
            </div>
            
            {/* View mode toggle */}
            <div className="flex items-center justify-between sm:justify-end space-x-3">
              <div className="flex items-center bg-gray-200/50 dark:bg-gray-700/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                  title="Grid View"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                  <span className={`text-xs sm:text-sm ${isMobile ? 'hidden' : ''}`}>Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                  title="List View"
                >
                  <ListBulletIcon className="w-4 h-4" />
                  <span className={`text-xs sm:text-sm ${isMobile ? 'hidden' : ''}`}>List</span>
                </button>
              </div>
              
              {totalSelected > 0 && (
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30' 
                      : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                  }`}
                >
                  Clear{isMobile ? '' : ' Selection'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile-responsive content grid/list */}
        {filteredEntries.length > 0 ? (
          <div className={
            viewMode === 'grid' 
              ? `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4` 
              : 'space-y-2'
          }>
            {filteredEntries.map((item, index) => (
              <FolderItem key={`${item.name}-${index}`} item={item} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            {folderSearchTerm ? (
              <>
                <MagnifyingGlassIcon className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h4 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No results found
                </h4>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4">
                  No files or folders match "{folderSearchTerm}"
                </p>
                <button
                  onClick={() => setFolderSearchTerm('')}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <FolderIcon className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h4 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Empty folder
                </h4>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                  This folder doesn't contain any files or subfolders
                </p>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // Fullscreen functions
  const openFullScreen = (type, url, text = '') => {
    setFullscreen({ open: true, type, url, text });
    document.body.style.overflow = 'hidden';
  };
  
  const closeFullScreen = () => {
    setFullscreen({ open: false, type: '', url: '', text: '' });
    document.body.style.overflow = '';
  };

  // ESC key handler for fullscreen
  useEffect(() => {
    if (!fullscreen.open) return;
    const onEsc = (e) => { 
      if (e.key === 'Escape') closeFullScreen(); 
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [fullscreen.open]);

  // Get file extension from content type
  const getFileExtension = (contentType) => {
    const extensions = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'text/plain': '.txt',
      'text/markdown': '.md',
      'application/json': '.json',
      'application/pdf': '.pdf',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav'
    };
    return extensions[contentType] || '';
  };

  // Helper function to get file type icon (legacy support)
  const getFileTypeIcon = (fileType, size = 'w-4 h-4') => {
    if (!fileType) return <DocumentIcon className={size} />;
    
    const type = fileType.toLowerCase();
    if (type.startsWith('image/')) return <PhotoIcon className={size} />;
    if (type.startsWith('video/')) return <FilmIcon className={size} />;
    if (type.startsWith('audio/')) return <MusicalNoteIcon className={size} />;
    if (type.startsWith('text/')) return <DocumentTextIcon className={size} />;
    if (type === 'application/pdf') return <DocumentIcon className={size} />;
    return <DocumentIcon className={size} />;
  };

  // Check if CID is uploaded (for analytics button visibility)
  const isCidUploaded = (cid) => {
    return uploads.some(upload => upload.cid === cid);
  };

  // Custom download function
  const initiateCustomDownload = (cid, defaultName = '') => {
    setDownloadCid(cid);
    
    // Generate suggested filename
    let suggested = defaultName;
    if (!suggested) {
      const ext = meta ? getFileExtension(meta.type) : '';
      suggested = `${cid.substring(0, 8)}${ext}`;
    }
    
    setSuggestedFilename(suggested);
    setCustomFilename(suggested);
    setShowFilenameModal(true);
  };

  // Execute download with custom filename
  const executeCustomDownload = () => {
    if (!customFilename.trim()) {
      alert('Please enter a filename');
      return;
    }
    
    const filename = customFilename.trim();
    const downloadUrl = `${API_BASE}/content?cid=${downloadCid}&filename=${encodeURIComponent(filename)}`;
    
    // Create temporary link to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Close modal
    setShowFilenameModal(false);
    setCustomFilename('');
    setDownloadCid('');
  };

  const handleSearch = (newQuery) => {
    if (newQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(newQuery)}`);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setShowShareOptions(false);
      }, 1200);
    } catch {
      alert("❌ Failed to copy link.");
    }
  };

  const saveToHistory = async (cid) => {
    if (savedCids.current.has(cid)) return;
    savedCids.current.add(cid);
    try {
      await fetch(`${API_BASE}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid }),
      });
    } catch (err) {
      console.warn("⚠️ Failed to save to history:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setHistory([]);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const res = await fetch(`${API_BASE}/bookmarks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBookmarks(Array.isArray(data) ? data : []);
      setIsBookmarked(data.some(bookmark => bookmark.cid === query));
    } catch (err) {
      console.error("Failed to fetch bookmarks:", err);
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
      console.error("Failed to fetch uploads:", err);
      setUploads([]);
    }
  };

  // Group management functions
  const fetchGroups = async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/groups`);
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const fetchGroupDetails = async (groupId) => {
    try {
      const res = await fetch(`${API_BASE}/groups/${groupId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedGroup(data);
        setShowGroupModal(true);
      } else {
        alert(data.error || 'Failed to fetch group details');
      }
    } catch (err) {
      console.error("Failed to fetch group details:", err);
      alert('Failed to fetch group details');
    }
  };

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
      console.error("Failed to create group:", err);
      alert('Failed to create group');
    }
  };

  const addToGroup = async (groupId) => {
    try {
      const res = await fetch(`${API_BASE}/groups/${groupId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid: query }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setShowAddToGroupModal(false);
        alert('CID added to group successfully!');
      } else {
        alert(data.error || 'Failed to add CID to group');
      }
    } catch (err) {
      console.error("Failed to add CID to group:", err);
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
          fetchGroupDetails(targetGroupId);
        }
        setShowAddCidModal(false);
        setManualCid('');
        setTargetGroupId(null);
        alert('CID added to group successfully!');
      } else {
        alert(data.error || 'Failed to add CID to group');
      }
    } catch (err) {
      console.error("Failed to add CID to group:", err);
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
            fetchGroupDetails(groupId);
          }
          alert('CID removed from group successfully!');
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to remove CID from group');
        }
      } catch (err) {
        console.error("Failed to remove CID from group:", err);
        alert('Failed to remove CID from group');
      }
    }
  };

  const openAddCidModal = (groupId) => {
    setTargetGroupId(groupId);
    setShowAddCidModal(true);
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
      console.error("Failed to rename group:", err);
      alert('Failed to rename group');
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
        console.error("Failed to delete group:", err);
        alert('Failed to delete group');
      }
    }
  };

  // Analytics functions
  const fetchAnalyticsDashboard = async (days = 30) => {
    try {
      const res = await fetch(`${API_BASE}/analytics/dashboard?days=${days}`);
      const data = await res.json();
      if (data.error) {
        console.error("Analytics error:", data.error);
      } else {
        setAnalytics(data);
      }
    } catch (err) {
      console.error("❌ Failed to fetch analytics dashboard:", err);
    }
  };

  const fetchRealtimeAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/realtime`);
      const data = await res.json();
      if (data.error) {
        console.error("Realtime analytics error:", data.error);
      } else {
        setRealtimeAnalytics(data);
      }
    } catch (err) {
      console.error("❌ Failed to fetch realtime analytics:", err);
    }
  };

  const fetchCidAnalytics = async (cid, days = 7) => {
    try {
      const res = await fetch(`${API_BASE}/analytics/cid/${cid}?days=${days}`);
      const data = await res.json();
      if (data.error) {
        alert(`Analytics Error: ${data.error}`);
        return;
      }
      setCidAnalytics(prev => ({
        ...prev,
        [cid]: data
      }));
    } catch (err) {
      console.error("❌ Failed to fetch CID analytics:", err);
      alert("Failed to fetch CID analytics. This content may not have been uploaded by you.");
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

  const toggleBookmark = async () => {
    try {
      if (isBookmarked) {
        await fetch(`${API_BASE}/bookmarks`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cid: query }),
        });
        setIsBookmarked(false);
        setBookmarks(prev => prev.filter(b => b.cid !== query));
      } else {
        const bookmarkData = {
          cid: query,
          title: `Content ${query.slice(0, 8)}...`,
          type: meta?.type || 'unknown',
          size: meta?.size || 0,
          timestamp: new Date().toISOString()
        };
        
        await fetch(`${API_BASE}/bookmarks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookmarkData),
        });
        setIsBookmarked(true);
        setBookmarks(prev => [bookmarkData, ...prev]);
      }
    } catch (err) {
      console.error("❌ Failed to toggle bookmark:", err);
    }
  };

  const deleteHistory = async (cid) => {
    try {
      await fetch(`${API_BASE}/history`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid }),
      });
      setHistory((prev) => prev.filter((item) => item.cid !== cid));
    } catch (err) {
      console.error("❌ Failed to delete:", err);
    }
  };

  const deleteBookmark = async (cid) => {
    try {
      await fetch(`${API_BASE}/bookmarks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid }),
      });
      setBookmarks((prev) => prev.filter((item) => item.cid !== cid));
      if (cid === query) setIsBookmarked(false);
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

  const fetchCID = async (retryAttempt = false) => {
    if (retryAttempt) setIsRetrying(true);
    else setLoading(true);
    
    setError('');
    setMeta(null);
    setEntries([]);
    setTextContent('');

    try {
      const res = await fetch(`${API_BASE}/metadata?cid=${query}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setMeta(data);
        await saveToHistory(query);
        await fetchHistory();
        
        setIsBookmarked(bookmarks.some(bookmark => bookmark.cid === query));

        if (data.is_dir) {
          try {
            const dirRes = await fetch(`${API_BASE}/ls?cid=${query}`);
            const dirData = await dirRes.json();
            if (dirData.entries) {
              // Enhanced entries processing with better size handling
              const enhancedEntries = dirData.entries.map(entry => ({
                name: entry.name,
                cid: entry.cid,
                size: entry.size || 0,
                size_human: entry.size_human || (entry.size ? formatSize(entry.size) : null),
                type: entry.type || 'unknown',
                isDir: entry.is_directory || entry.type === 'directory',
                preview_type: entry.preview_type || 'download',
                icon_class: entry.icon_class || 'file',
                extension: entry.extension || '',
                can_preview: entry.can_preview || false,
                parent_cid: entry.parent_cid || query,
                modified: entry.modified || entry.last_modified,
                created: entry.created || entry.created_at,
                item_count: entry.item_count, // For directories
                fileSize: entry.fileSize || entry.size // Additional fallback
              }));
              setEntries(enhancedEntries);
            }
          } catch (dirErr) {
            console.warn("Failed to fetch directory listing:", dirErr);
          }
        }

        if (
          data.type === 'text/plain' ||
          data.type === 'application/json' ||
          data.type === 'text/markdown'
        ) {
          try {
            const textRes = await fetch(`${API_BASE}/content?cid=${query}`);
            const text = await textRes.text();
            setTextContent(text);
          } catch (textErr) {
            console.warn("Failed to fetch text content:", textErr);
          }
        }
      }
    } catch (fetchErr) {
      setError(`❌ Failed to fetch CID data: ${fetchErr.message}`);
    }

    setLoading(false);
    setIsRetrying(false);
  };

  const handleRetry = () => {
    if (query) {
      fetchCID(true);
    }
  };

  const handleSectionClick = (section) => {
    if (activeSection === section && sidebarOpen) {
      setSidebarOpen(false);
    } else {
      setActiveSection(section);
      setSidebarOpen(true);
      
      if (section === 'analytics') {
        fetchAnalyticsDashboard(selectedAnalyticsPeriod);
        fetchRealtimeAnalytics();
      }
      if (section === 'groups') {
        fetchGroups();
      }
    }
  };

  const openCidAnalytics = (cid) => {
    setSelectedCidForAnalytics(cid);
    fetchCidAnalytics(cid, 7);
    setShowAnalyticsModal(true);
  };

  useEffect(() => {
    fetchHistory();
    fetchBookmarks();
    fetchUploads();
    fetchGroups();
    
    const realtimeInterval = setInterval(fetchRealtimeAnalytics, 30000);
    return () => clearInterval(realtimeInterval);
  }, []);

  useEffect(() => {
    if (!query) return;
    
    // Extract path from query if it contains slashes
    const pathParts = query.split('/');
    const baseCid = pathParts[0];
    const path = pathParts.slice(1).join('/');
    
    setCurrentPath(path);
    setPathHistory([]);
    
    fetchCID();
  }, [query, bookmarks]);

  const renderPreview = () => {
    if (!meta) return null;
    const contentUrl = `${API_BASE}/content?cid=${query}`;

    // Image preview
    if (meta.type.startsWith('image/')) {
      const suggestedName = `image_${query.substring(0, 8)}${getFileExtension(meta.type)}`;
      return (
        <div className={`space-y-4 sm:space-y-6 p-4 sm:p-6 rounded-xl border ${
          darkMode 
            ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50' 
            : 'bg-gradient-to-br from-white/80 to-gray-50/80 border-gray-200/50'
        } backdrop-blur-sm shadow-lg`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              darkMode ? 'bg-blue-600/20' : 'bg-blue-100'
            }`}>
              <PhotoIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Image Preview
              </h3>
              <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {meta.type} • {formatSize(meta.size)}
              </p>
            </div>
          </div>
          
          <div className="relative group">
            <img 
              src={contentUrl} 
              alt="Preview" 
              className="max-w-full max-h-[300px] sm:max-h-[500px] rounded-lg shadow-xl object-contain mx-auto border border-gray-200/30 dark:border-gray-700/30 transition-all duration-300 group-hover:shadow-2xl"
            />
            <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/5 transition-all duration-300" />
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => openFullScreen('image', contentUrl)}
              className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${
                darkMode 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/25' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/25'
              }`}
            >
              <ArrowsPointingOutIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Full Screen</span>
            </button>
            <button
              onClick={() => initiateCustomDownload(query, suggestedName)}
              className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${
                darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
              }`}
            >
              <ArrowDownTrayIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Download{isMobile ? '' : ' Image'}</span>
            </button>
          </div>
        </div>
      );
    }

    // Video preview
    if (meta.type.startsWith('video/')) {
      const suggestedName = `video_${query.substring(0, 8)}${getFileExtension(meta.type)}`;
      return (
        <div className={`space-y-4 sm:space-y-6 p-4 sm:p-6 rounded-xl border ${
          darkMode 
            ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50' 
            : 'bg-gradient-to-br from-white/80 to-gray-50/80 border-gray-200/50'
        } backdrop-blur-sm shadow-lg`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              darkMode ? 'bg-purple-600/20' : 'bg-purple-100'
            }`}>
              <FilmIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Video Preview
              </h3>
              <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {meta.type} • {formatSize(meta.size)}
              </p>
            </div>
          </div>
          
          <div className="relative">
            <video 
              src={contentUrl} 
              controls 
              className="w-full max-w-2xl max-h-64 sm:max-h-96 rounded-lg shadow-xl object-contain mx-auto border border-gray-200/30 dark:border-gray-700/30"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => openFullScreen('video', contentUrl)}
              className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${
                darkMode 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/25' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/25'
              }`}
            >
              <ArrowsPointingOutIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Full Screen</span>
            </button>
            <button
              onClick={() => initiateCustomDownload(query, suggestedName)}
              className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${
                darkMode 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/25' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/25'
              }`}
            >
              <ArrowDownTrayIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Download{isMobile ? '' : ' Video'}</span>
            </button>
          </div>
        </div>
      );
    }

    // Audio preview
    if (meta.type.startsWith('audio/')) {
      const suggestedName = `audio_${query.substring(0, 8)}${getFileExtension(meta.type)}`;
      return (
        <div className={`space-y-4 sm:space-y-6 p-4 sm:p-6 rounded-xl border ${
          darkMode 
            ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50' 
            : 'bg-gradient-to-br from-white/80 to-gray-50/80 border-gray-200/50'
        } backdrop-blur-sm shadow-lg`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              darkMode ? 'bg-green-600/20' : 'bg-green-100'
            }`}>
              <MusicalNoteIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Audio Preview
              </h3>
              <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {meta.type} • {formatSize(meta.size)}
              </p>
            </div>
          </div>
          
          <div className="relative">
            <audio 
              src={contentUrl} 
              controls 
              className="w-full max-w-lg mx-auto"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => openFullScreen('audio', contentUrl)}
              className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${
                darkMode 
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/25' 
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/25'
              }`}
            >
              <ArrowsPointingOutIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Full Screen</span>
            </button>
            <button
              onClick={() => initiateCustomDownload(query, suggestedName)}
              className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${
                darkMode 
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/25' 
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/25'
              }`}
            >
              <ArrowDownTrayIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Download{isMobile ? '' : ' Audio'}</span>
            </button>
          </div>
        </div>
      );
    }

    // PDF preview
    if (meta.type === 'application/pdf') {
      const suggestedName = `document_${query.substring(0, 8)}.pdf`;
      return (
        <div className={`space-y-4 sm:space-y-6 p-4 sm:p-6 rounded-xl border ${
          darkMode 
            ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50' 
            : 'bg-gradient-to-br from-white/80 to-gray-50/80 border-gray-200/50'
        } backdrop-blur-sm shadow-lg`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              darkMode ? 'bg-red-600/20' : 'bg-red-100'
            }`}>
              <DocumentIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            <div>
              <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                PDF Document
              </h3>
              <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {meta.type} • {formatSize(meta.size)}
              </p>
            </div>
          </div>
          
          <div className="relative">
            <iframe 
              src={`${contentUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              title="PDF Preview"
              className="w-full h-[400px] sm:h-[600px] rounded-lg border border-gray-200/30 dark:border-gray-700/30 shadow-inner"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => openFullScreen('pdf', contentUrl)}
              className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${
                darkMode 
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25' 
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25'
              }`}
            >
              <ArrowsPointingOutIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Full Screen</span>
            </button>
            <button
              onClick={() => initiateCustomDownload(query, suggestedName)}
              className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${
                darkMode 
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25' 
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25'
              }`}
            >
              <ArrowDownTrayIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Download{isMobile ? '' : ' PDF'}</span>
            </button>
            <a 
              href={contentUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${
                darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
              }`}
            >
              <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>New Tab</span>
            </a>
          </div>
        </div>
      );
    }

    // Text content preview
    if (
      meta.type === 'text/plain' ||
      meta.type === 'text/markdown' ||
      meta.type === 'application/json'
    ) {
      const suggestedName = `document_${query.substring(0, 8)}${getFileExtension(meta.type)}`;
      return (
        <div className={`space-y-4 sm:space-y-6 p-4 sm:p-6 rounded-xl border ${
          darkMode 
            ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50' 
            : 'bg-gradient-to-br from-white/80 to-gray-50/80 border-gray-200/50'
        } backdrop-blur-sm shadow-lg`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              darkMode ? 'bg-indigo-600/20' : 'bg-indigo-100'
            }`}>
              <DocumentTextIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div>
              <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Text Document
              </h3>
              <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {meta.type} • {formatSize(meta.size)}
              </p>
            </div>
          </div>
          
          <div className="relative">
            <pre className={`p-3 sm:p-4 rounded-lg overflow-auto max-h-[300px] sm:max-h-[500px] text-xs sm:text-sm whitespace-pre-wrap border ${
              darkMode 
                ? 'bg-gray-900/50 border-gray-700/30 text-gray-100' 
                : 'bg-gray-50/50 border-gray-200/30 text-gray-800'
            } shadow-inner`}>
              {textContent}
            </pre>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => openFullScreen('text', '', textContent)}
              className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${
                darkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-500/25' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-500/25'
              }`}
            >
              <ArrowsPointingOutIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Full Screen</span>
            </button>
            <button
              onClick={() => initiateCustomDownload(query, suggestedName)}
              className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${
                darkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-500/25' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-500/25'
              }`}
            >
              <ArrowDownTrayIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Download{isMobile ? '' : ' File'}</span>
            </button>
          </div>
        </div>
      );
    }

    // Default file preview
    const suggestedName = `file_${query.substring(0, 8)}`;
    return (
      <div className={`space-y-4 sm:space-y-6 p-4 sm:p-6 rounded-xl border ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50' 
          : 'bg-gradient-to-br from-white/80 to-gray-50/80 border-gray-200/50'
      } backdrop-blur-sm shadow-lg`}>
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            darkMode ? 'bg-gray-600/20' : 'bg-gray-100'
          }`}>
            <DocumentIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </div>
          <div>
            <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              File Content
            </h3>
            <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {meta.type} • {formatSize(meta.size)}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => initiateCustomDownload(query, suggestedName)}
            className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
            }`}
          >
            <ArrowDownTrayIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Download{isMobile ? '' : ' File'}</span>
          </button>
        </div>
      </div>
    );
  };

  // Mobile-optimized fullscreen modal component
  const renderFullscreenModal = () => {
    if (!fullscreen.open) return null;
    
    return (
      <div
        className="fixed inset-0 z-[9999] bg-black bg-opacity-95 flex items-center justify-center"
        onClick={closeFullScreen}
        style={{ cursor: 'zoom-out' }}
      >
        <div className="relative flex items-center justify-center w-full h-full p-2 sm:p-4" onClick={e => e.stopPropagation()}>
          <button
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 bg-black/70 hover:bg-black text-white rounded-full p-2 sm:p-3 transition-all duration-200"
            onClick={closeFullScreen}
            aria-label="Close fullscreen"
          >
            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6"/>
          </button>
          
          {fullscreen.type === 'image' && (
            <img 
              src={fullscreen.url} 
              alt="Fullscreen preview" 
              className="max-h-[90vh] max-w-[90vw] sm:max-h-[95vh] sm:max-w-[95vw] object-contain rounded-lg shadow-2xl"
            />
          )}
          
          {fullscreen.type === 'video' && (
            <video 
              src={fullscreen.url} 
              controls 
              autoPlay 
              className="max-h-[90vh] max-w-[90vw] sm:max-h-[95vh] sm:max-w-[95vw] rounded-lg shadow-2xl"
            />
          )}
          
          {fullscreen.type === 'audio' && (
            <div className="bg-gray-900 rounded-xl p-6 sm:p-8 shadow-2xl">
              <audio 
                src={fullscreen.url} 
                controls 
                autoPlay 
                className="w-[300px] sm:w-[500px] max-w-[90vw]"
              />
            </div>
          )}
          
          {fullscreen.type === 'pdf' && (
            <iframe 
              src={fullscreen.url} 
              className="w-[90vw] h-[90vh] sm:w-[95vw] sm:h-[95vh] rounded-lg shadow-2xl border border-white/20" 
              title="PDF Fullscreen"
            />
          )}
          
          {fullscreen.type === 'text' && (
            <div className="w-[90vw] h-[90vh] sm:w-[95vw] sm:h-[95vh] bg-gray-900 rounded-lg shadow-2xl overflow-auto">
              <pre className="text-white text-sm sm:text-base p-4 sm:p-6 whitespace-pre-wrap leading-relaxed">
                {fullscreen.text}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-black'}`}>
      
      {/* Mobile Header with Menu Button */}
      {isMobile && (
        <div className={`fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 border-b ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-lg ${
              darkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">IPFS Browser</h1>
          <div className="w-9"></div> {/* Spacer for centering */}
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Responsive Sidebar */}
      <div className={`${
        isMobile 
          ? `fixed left-0 top-0 z-50 h-full transition-transform duration-300 ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : 'relative'
      } ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} 
      ${isMobile ? 'w-80' : 'w-14'} border-r flex flex-col`}>
        
        {/* Mobile header in sidebar */}
        {isMobile && (
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold">Menu</h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-700"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Sidebar Icons */}
        <div className={`${isMobile ? 'p-4 space-y-4' : 'py-3 space-y-2 items-center'} flex flex-col`}>
          {/* History */}
          <button
            onClick={() => {
              handleSectionClick('history');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`${isMobile ? 'w-full flex items-center space-x-3 p-3' : 'p-2.5'} rounded-lg transition-all duration-200 hover:scale-105 group relative ${
              activeSection === 'history' && sidebarOpen
                ? darkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-500 text-white shadow-lg'
                : darkMode ? 'bg-gray-700/50 hover:bg-gray-600 text-gray-300 hover:text-white' : 'bg-gray-100/50 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
            }`}
            title="History"
          >
            {activeSection === 'history' && sidebarOpen ? (
              <ClockSolidIcon className="w-5 h-5" />
            ) : (
              <ClockIcon className="w-5 h-5" />
            )}
            {isMobile && <span>History ({history.length})</span>}
            {!isMobile && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                History ({history.length})
              </div>
            )}
          </button>

          {/* Bookmarks */}
          <button
            onClick={() => {
              handleSectionClick('bookmarks');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`${isMobile ? 'w-full flex items-center space-x-3 p-3' : 'p-2.5'} rounded-lg transition-all duration-200 hover:scale-105 group relative ${
              activeSection === 'bookmarks' && sidebarOpen
                ? darkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-500 text-white shadow-lg'
                : darkMode ? 'bg-gray-700/50 hover:bg-gray-600 text-gray-300 hover:text-white' : 'bg-gray-100/50 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
            }`}
            title="Bookmarks"
          >
            {activeSection === 'bookmarks' && sidebarOpen ? (
              <BookmarkSolidIcon className="w-5 h-5" />
            ) : (
              <BookmarkIcon className="w-5 h-5" />
            )}
            {isMobile && <span>Bookmarks ({bookmarks.length})</span>}
            {!isMobile && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                Bookmarks ({bookmarks.length})
              </div>
            )}
          </button>

          {/* Uploads */}
          <button
            onClick={() => {
              handleSectionClick('uploads');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`${isMobile ? 'w-full flex items-center space-x-3 p-3' : 'p-2.5'} rounded-lg transition-all duration-200 hover:scale-105 group relative ${
              activeSection === 'uploads' && sidebarOpen
                ? darkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-500 text-white shadow-lg'
                : darkMode ? 'bg-gray-700/50 hover:bg-gray-600 text-gray-300 hover:text-white' : 'bg-gray-100/50 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
            }`}
            title="Uploads"
          >
            {activeSection === 'uploads' && sidebarOpen ? (
              <CloudArrowUpSolidIcon className="w-5 h-5" />
            ) : (
              <CloudArrowUpIcon className="w-5 h-5" />
            )}
            {isMobile && <span>Uploads ({uploads.length})</span>}
            {!isMobile && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                Uploads ({uploads.length})
              </div>
            )}
          </button>

          {/* Groups */}
          <button
            onClick={() => {
              handleSectionClick('groups');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`${isMobile ? 'w-full flex items-center space-x-3 p-3' : 'p-2.5'} rounded-lg transition-all duration-200 hover:scale-105 group relative ${
              activeSection === 'groups' && sidebarOpen
                ? darkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-500 text-white shadow-lg'
                : darkMode ? 'bg-gray-700/50 hover:bg-gray-600 text-gray-300 hover:text-white' : 'bg-gray-100/50 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
            }`}
            title="Groups"
          >
            {activeSection === 'groups' && sidebarOpen ? (
              <FolderSolidIcon className="w-5 h-5" />
            ) : (
              <FolderIcon className="w-5 h-5" />
            )}
            {isMobile && <span>Groups ({groups.length})</span>}
            {!isMobile && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                Groups ({groups.length})
              </div>
            )}
          </button>

          {/* Analytics */}
          <button
            onClick={() => {
              handleSectionClick('analytics');
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`${isMobile ? 'w-full flex items-center space-x-3 p-3' : 'p-2.5'} rounded-lg transition-all duration-200 hover:scale-105 group relative ${
              activeSection === 'analytics' && sidebarOpen
                ? darkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-500 text-white shadow-lg'
                : darkMode ? 'bg-gray-700/50 hover:bg-gray-600 text-gray-300 hover:text-white' : 'bg-gray-100/50 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
            }`}
            title="Analytics"
          >
            {activeSection === 'analytics' && sidebarOpen ? (
              <ChartBarSolidIcon className="w-5 h-5" />
            ) : (
              <ChartBarIcon className="w-5 h-5" />
            )}
            {isMobile && <span>Analytics</span>}
            {!isMobile && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                Analytics
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 ${isMobile ? 'pt-16' : ''}`}>
        {/* Content Sidebar - Hidden on mobile, showing on desktop when sidebar is open */}
        <div className={`${isMobile ? 'hidden' : ''} h-screen border-r overflow-y-auto transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full'
        } ${darkMode ? 'bg-gray-850/95 border-gray-700/50 backdrop-blur-sm' : 'bg-white/95 border-gray-200/50 backdrop-blur-sm'}`}>
          
          <div className={`p-4 ${sidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
            {/* History Section */}
            {activeSection === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <ClockSolidIcon className="w-4 h-4 text-blue-500" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">History</h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {history.length} items
                </p>

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
                      className={`group flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
                        darkMode
                          ? 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-700/60 hover:border-gray-600/70'
                          : 'bg-white/80 border-gray-200/50 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                      onClick={() => navigate(`/search?q=${encodeURIComponent(item.cid)}`)}
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {getFileTypeIcon(item.type, 'w-3.5 h-3.5')}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {item.cid?.slice(0, 8)}...{item.cid?.slice(-6)}
                          </p>
                          <div className="flex items-center space-x-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            <span>{item.type || 'unknown'}</span>
                            <span>•</span>
                            <span>{formatSize(item.size || 0)}</span>
                            <span>•</span>
                            <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isCidUploaded(item.cid) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCidAnalytics(item.cid);
                            }}
                            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                            title="Analytics"
                          >
                            <ChartBarIcon className="w-3 h-3 text-blue-500" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistory(item.cid);
                          }}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bookmarks Section */}
            {activeSection === 'bookmarks' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <BookmarkSolidIcon className="w-4 h-4 text-blue-500" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Bookmarks</h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {bookmarks.length} items
                </p>

                <div className="space-y-1.5">
                  {bookmarks.length === 0 && (
                    <div className="text-center py-8">
                      <BookmarkIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">No bookmarks</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Bookmark content to access later
                      </p>
                    </div>
                  )}
                  
                  {bookmarks.map((item, index) => (
                    <div
                      key={index}
                      className={`group flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
                        darkMode
                          ? 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-700/60 hover:border-gray-600/70'
                          : 'bg-white/80 border-gray-200/50 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                      onClick={() => navigate(`/search?q=${encodeURIComponent(item.cid)}`)}
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {getFileTypeIcon(item.type, 'w-3.5 h-3.5')}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {item.title || `${item.cid?.slice(0, 8)}...${item.cid?.slice(-6)}`}
                          </p>
                          <div className="flex items-center space-x-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            <span>{item.type || 'unknown'}</span>
                            <span>•</span>
                            <span>{formatSize(item.size || 0)}</span>
                            <span>•</span>
                            <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isCidUploaded(item.cid) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCidAnalytics(item.cid);
                            }}
                            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                            title="Analytics"
                          >
                            <ChartBarIcon className="w-3 h-3 text-blue-500" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBookmark(item.cid);
                          }}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                          title="Remove bookmark"
                        >
                          <BookmarkSlashIcon className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Uploads Section */}
            {activeSection === 'uploads' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <CloudArrowUpSolidIcon className="w-4 h-4 text-blue-500" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Uploads</h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {uploads.length} items
                </p>

                <div className="space-y-1.5">
                  {uploads.length === 0 && (
                    <div className="text-center py-8">
                      <CloudArrowUpIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">No uploads</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Your uploaded content appears here
                      </p>
                    </div>
                  )}
                  
                  {uploads.map((item, index) => (
                    <div
                      key={index}
                      className={`group flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
                        darkMode
                          ? 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-700/60 hover:border-gray-600/70'
                          : 'bg-white/80 border-gray-200/50 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                      onClick={() => navigate(`/search?q=${encodeURIComponent(item.cid)}`)}
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {getFileTypeIcon(item.type, 'w-3.5 h-3.5')}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {item.filename || `${item.cid?.slice(0, 8)}...${item.cid?.slice(-6)}`}
                          </p>
                          <div className="flex items-center space-x-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            <span>{item.type || 'unknown'}</span>
                            <span>•</span>
                            <span>{formatSize(item.size || 0)}</span>
                            <span>•</span>
                            <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCidAnalytics(item.cid);
                          }}
                          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          title="Analytics"
                        >
                          <ChartBarIcon className="w-3 h-3 text-blue-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteUpload(item.cid);
                          }}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Groups Section */}
            {activeSection === 'groups' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <FolderSolidIcon className="w-4 h-4 text-blue-500" />
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Groups</h2>
                  </div>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      darkMode 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    title="Create Group"
                  >
                    <PlusIcon className="w-3 h-3" />
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {groupsLoading ? 'Loading...' : `${groups.length} groups`}
                </p>

                <div className="space-y-1.5">
                  {!groupsLoading && groups.length === 0 && (
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
                      className={`group flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
                        darkMode
                          ? 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-700/60 hover:border-gray-600/70'
                          : 'bg-white/80 border-gray-200/50 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                      onClick={() => fetchGroupDetails(group.id)}
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <FolderIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {group.name}
                          </p>
                          <div className="flex items-center space-x-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            <span>{group.item_count || 0} items</span>
                            <span>•</span>
                            <span>{new Date(group.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddCidModal(group.id);
                          }}
                          className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                          title="Add CID"
                        >
                          <PlusIcon className="w-3 h-3 text-green-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setGroupToRename(group);
                            setRenameGroupName(group.name);
                            setShowRenameGroupModal(true);
                          }}
                          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          title="Rename"
                        >
                          <PencilIcon className="w-3 h-3 text-blue-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Section */}
            {activeSection === 'analytics' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <ChartBarSolidIcon className="w-4 h-4 text-blue-500" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Analytics</h2>
                </div>

                {/* Period Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Period</label>
                  <select
                    value={selectedAnalyticsPeriod}
                    onChange={(e) => {
                      const days = parseInt(e.target.value);
                      setSelectedAnalyticsPeriod(days);
                      fetchAnalyticsDashboard(days);
                    }}
                    className={`w-full px-2 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                    <option value={365}>Last year</option>
                  </select>
                </div>

                {/* Realtime Stats */}
                {realtimeAnalytics && (
                  <div className={`p-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700/50' 
                      : 'bg-gray-50/50 border-gray-200/50'
                  }`}>
                    <h4 className="text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">Real-time</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Active:</span>
                        <span className="ml-1 font-medium">{realtimeAnalytics.active_sessions || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Today:</span>
                        <span className="ml-1 font-medium">{realtimeAnalytics.requests_today || 0}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analytics Dashboard */}
                {analytics && (
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-800/50 border-gray-700/50' 
                        : 'bg-gray-50/50 border-gray-200/50'
                    }`}>
                      <h4 className="text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">Overview</h4>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Total Requests:</span>
                          <span className="font-medium">{formatNumber(analytics.total_requests || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Unique CIDs:</span>
                          <span className="font-medium">{formatNumber(analytics.unique_cids || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Data Served:</span>
                          <span className="font-medium">{formatSize(analytics.total_bytes_served || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Avg Response:</span>
                          <span className="font-medium">{analytics.avg_response_time || 0}ms</span>
                        </div>
                      </div>
                    </div>

                    {/* Top CIDs */}
                    {analytics.top_cids && analytics.top_cids.length > 0 && (
                      <div className={`p-3 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-800/50 border-gray-700/50' 
                          : 'bg-gray-50/50 border-gray-200/50'
                      }`}>
                        <h4 className="text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">Top CIDs</h4>
                        <div className="space-y-1.5">
                          {analytics.top_cids.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <button
                                onClick={() => navigate(`/search?q=${encodeURIComponent(item.cid)}`)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate mr-2 flex-1 text-left"
                                title={item.cid}
                              >
                                {item.cid.slice(0, 12)}...
                              </button>
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {formatNumber(item.requests)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Export Button */}
                    <button
                      onClick={() => exportAnalytics('dashboard', selectedAnalyticsPeriod)}
                      className={`w-full px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        darkMode 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      Export Analytics
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          {/* Search Component */}
          <div className="mb-4 sm:mb-6">
            <Search onSearch={handleSearch} />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8 sm:py-12">
              <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {isRetrying ? 'Retrying...' : 'Loading content...'}
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className={`p-4 sm:p-6 rounded-xl border ${
              darkMode 
                ? 'bg-red-900/20 border-red-700/50 text-red-400' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium mb-2">Error Loading Content</h3>
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className={`inline-flex items-center space-x-2 mt-4 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isRetrying
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : darkMode
                        ? 'bg-red-700 hover:bg-red-600 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {isRetrying ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowPathIcon className="w-4 h-4" />
                    )}
                    <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content Display */}
          {meta && !loading && (
            <div className="space-y-4 sm:space-y-6">
              {/* Content Details Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold mb-2">
                    Content Details
                  </h2>
                  <div className={`p-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700/50' 
                      : 'bg-gray-50/50 border-gray-200/50'
                  } backdrop-blur-sm`}>
                    <p className="text-xs sm:text-sm font-mono text-blue-600 dark:text-blue-400 break-all mb-2">
                      {query}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      <span>Type: {meta.type}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Size: {formatSize(meta.size)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons - Stack vertically on mobile */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowAddToGroupModal(true)}
                    className={`inline-flex items-center space-x-1 px-3 py-2 text-xs sm:text-sm rounded-md font-medium transition-colors ${
                      darkMode 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                    title="Add to Group"
                  >
                    <FolderIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Add to Group</span>
                  </button>

                  <button
                    onClick={toggleBookmark}
                    className={`inline-flex items-center space-x-1 px-3 py-2 text-xs sm:text-sm rounded-md font-medium transition-colors ${
                      isBookmarked
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : darkMode 
                          ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                    title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                  >
                    {isBookmarked ? (
                      <BookmarkSolidIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    ) : (
                      <BookmarkIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                    <span className="hidden sm:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                  </button>

                  {/* Share Button with Mobile-optimized Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowShareOptions(!showShareOptions)}
                      className={`inline-flex items-center space-x-1 px-3 py-2 text-xs sm:text-sm rounded-md font-medium transition-colors ${
                        darkMode 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <ShareIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Share</span>
                    </button>
                    
                    {/* Mobile-optimized Share Menu */}
                    {showShareOptions && (
                      <div className={`absolute ${isMobile ? 'right-0' : 'right-0'} mt-1 w-40 rounded-lg shadow-xl border z-50 ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-700' 
                          : 'bg-white border-gray-200'
                      } animate-fade-in`}>
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-xs font-medium">Share</span>
                          <button
                            onClick={() => setShowShareOptions(false)}
                            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <XMarkIcon className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>
                        
                        <div className="p-1">
                          <button
                            onClick={handleCopyLink}
                            className={`flex items-center space-x-2 w-full px-2 py-2 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              copySuccess ? 'bg-green-50 dark:bg-green-900/20' : ''
                            }`}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center ${
                              copySuccess ? 'bg-green-500' : 'bg-gray-100 dark:bg-gray-700'
                            }`}>
                              {copySuccess ? (
                                <CheckIcon className="w-3 h-3 text-white" />
                              ) : (
                                <ClipboardDocumentIcon className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                              )}
                            </div>
                            <span className={copySuccess ? 'text-green-600 dark:text-green-400' : ''}>
                              {copySuccess ? 'Copied!' : 'Copy Link'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Render folder browser or content preview */}
              {meta.is_dir ? renderFolderBrowser() : renderPreview()}
            </div>
          )}

          {/* Mobile-responsive modals */}
          {/* Custom Filename Modal */}
          {showFilenameModal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className={`relative rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md transform transition-all duration-300 scale-100 border ${
                darkMode 
                  ? 'bg-gray-800/95 border-gray-700/50 backdrop-blur-xl' 
                  : 'bg-white/95 border-gray-200/50 backdrop-blur-xl'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-base sm:text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Download File
                  </h2>
                  <button
                    onClick={() => {
                      setShowFilenameModal(false);
                      setCustomFilename('');
                      setDownloadCid('');
                    }}
                    className={`p-1 rounded-md transition-all duration-200 ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Filename
                    </label>
                    <input
                      type="text"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      placeholder="Enter filename..."
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      }`}
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={executeCustomDownload}
                      disabled={!customFilename.trim()}
                      className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                        !customFilename.trim()
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transform hover:scale-[1.02]'
                      }`}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => {
                        setShowFilenameModal(false);
                        setCustomFilename('');
                        setDownloadCid('');
                      }}
                      className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
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

          {/* Add to Group Modal */}
          {showAddToGroupModal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className={`relative rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md border ${
                darkMode 
                  ? 'bg-gray-800/95 border-gray-700/50' 
                  : 'bg-white/95 border-gray-200/50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-base sm:text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Add to Group
                  </h2>
                  <button
                    onClick={() => setShowAddToGroupModal(false)}
                    className={`p-1 rounded-md transition-colors ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {groups.length === 0 ? (
                    <div className="text-center py-8">
                      <FolderIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No groups available</p>
                      <button
                        onClick={() => {
                          setShowAddToGroupModal(false);
                          setShowCreateGroupModal(true);
                        }}
                        className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Create a group
                      </button>
                    </div>
                  ) : (
                    groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => addToGroup(group.id)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-colors text-left ${
                          darkMode 
                            ? 'border-gray-700 hover:bg-gray-700/50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <FolderIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {group.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {group.item_count || 0} items
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowAddToGroupModal(false);
                      setShowCreateGroupModal(true);
                    }}
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border-2 border-dashed transition-colors ${
                      darkMode 
                        ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300' 
                        : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span className="text-sm">Create New Group</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Group Modal */}
          {showCreateGroupModal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className={`relative rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md border ${
                darkMode 
                  ? 'bg-gray-800/95 border-gray-700/50' 
                  : 'bg-white/95 border-gray-200/50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-base sm:text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Create Group
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateGroupModal(false);
                      setNewGroupName('');
                    }}
                    className={`p-1 rounded-md transition-colors ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter group name..."
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      }`}
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newGroupName.trim()) {
                          createGroup();
                        }
                      }}
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={createGroup}
                      disabled={!newGroupName.trim()}
                      className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                        !newGroupName.trim()
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-lg transform hover:scale-[1.02]'
                      }`}
                    >
                      Create Group
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateGroupModal(false);
                        setNewGroupName('');
                      }}
                      className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
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
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className={`relative rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-2xl max-h-[90vh] overflow-hidden border ${
                darkMode 
                  ? 'bg-gray-800/95 border-gray-700/50' 
                  : 'bg-white/95 border-gray-200/50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-base sm:text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'} truncate`}>
                    {selectedGroup.name}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openAddCidModal(selectedGroup.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                      title="Add CID"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteGroup(selectedGroup.id, selectedGroup.name)}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                      title="Delete Group"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowGroupModal(false)}
                      className={`p-1 rounded-md transition-colors ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedGroup.cids?.length || 0} CIDs in this group
                  </p>
                  
                  {(!selectedGroup.cids || selectedGroup.cids.length === 0) ? (
                    <div className="text-center py-8">
                      <FolderIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No CIDs in this group</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedGroup.cids.map((cidData, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            darkMode 
                              ? 'border-gray-700 hover:bg-gray-700/50' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <button
                            onClick={() => {
                              setShowGroupModal(false);
                              navigate(`/search?q=${encodeURIComponent(cidData.cid)}`);
                            }}
                            className="flex-1 text-left min-w-0"
                          >
                            <p className="text-sm font-mono text-blue-600 dark:text-blue-400 truncate">
                              {cidData.cid}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Added {new Date(cidData.added_at).toLocaleDateString()}
                            </p>
                          </button>
                          
                          <button
                            onClick={() => removeCidFromGroup(selectedGroup.id, cidData.cid)}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors ml-2"
                            title="Remove from group"
                          >
                            <XMarkIcon className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Add CID to Group Modal */}
          {showAddCidModal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className={`relative rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md border ${
                darkMode 
                  ? 'bg-gray-800/95 border-gray-700/50' 
                  : 'bg-white/95 border-gray-200/50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-base sm:text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Add CID to Group
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddCidModal(false);
                      setManualCid('');
                      setTargetGroupId(null);
                    }}
                    className={`p-1 rounded-md transition-colors ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      CID
                    </label>
                    <textarea
                      value={manualCid}
                      onChange={(e) => setManualCid(e.target.value)}
                      placeholder="Enter CID..."
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm resize-none font-mono ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      }`}
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={addManualCidToGroup}
                      disabled={!manualCid.trim()}
                      className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                        !manualCid.trim()
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-lg transform hover:scale-[1.02]'
                      }`}
                    >
                      Add CID
                    </button>
                    <button
                      onClick={() => {
                        setShowAddCidModal(false);
                        setManualCid('');
                        setTargetGroupId(null);
                      }}
                      className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
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
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className={`relative rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md border ${
                darkMode 
                  ? 'bg-gray-800/95 border-gray-700/50' 
                  : 'bg-white/95 border-gray-200/50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-base sm:text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Rename Group
                  </h2>
                  <button
                    onClick={() => {
                      setShowRenameGroupModal(false);
                      setGroupToRename(null);
                      setRenameGroupName('');
                    }}
                    className={`p-1 rounded-md transition-colors ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      New Group Name
                    </label>
                    <input
                      type="text"
                      value={renameGroupName}
                      onChange={(e) => setRenameGroupName(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      }`}
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && renameGroupName.trim()) {
                          renameGroup();
                        }
                      }}
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={renameGroup}
                      disabled={!renameGroupName.trim()}
                      className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                        !renameGroupName.trim()
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
                      className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
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
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className={`relative rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-2xl max-h-[90vh] overflow-hidden border ${
                darkMode 
                  ? 'bg-gray-800/95 border-gray-700/50' 
                  : 'bg-white/95 border-gray-200/50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-base sm:text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    CID Analytics
                  </h2>
                  <button
                    onClick={() => {
                      setShowAnalyticsModal(false);
                      setSelectedCidForAnalytics(null);
                    }}
                    className={`p-1 rounded-md transition-colors ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className={`p-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700/50 border-gray-600/50' 
                      : 'bg-gray-50/50 border-gray-200/50'
                  }`}>
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400 break-all mb-2">
                      {selectedCidForAnalytics}
                    </p>
                  </div>
                  
                  {cidAnalytics[selectedCidForAnalytics] ? (
                    <div className="space-y-4">
                      <div className={`p-3 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700/50 border-gray-600/50' 
                          : 'bg-gray-50/50 border-gray-200/50'
                      }`}>
                        <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">7-Day Statistics</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Total Requests:</span>
                            <span className="ml-2 font-medium">{formatNumber(cidAnalytics[selectedCidForAnalytics].total_requests || 0)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Data Served:</span>
                            <span className="ml-2 font-medium">{formatSize(cidAnalytics[selectedCidForAnalytics].total_bytes_served || 0)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Avg Response:</span>
                            <span className="ml-2 font-medium">{cidAnalytics[selectedCidForAnalytics].avg_response_time || 0}ms</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Last Access:</span>
                            <span className="ml-2 font-medium">
                              {cidAnalytics[selectedCidForAnalytics].last_accessed 
                                ? new Date(cidAnalytics[selectedCidForAnalytics].last_accessed).toLocaleDateString()
                                : 'Never'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {cidAnalytics[selectedCidForAnalytics].daily_stats && (
                        <div className={`p-3 rounded-lg border ${
                          darkMode 
                            ? 'bg-gray-700/50 border-gray-600/50' 
                            : 'bg-gray-50/50 border-gray-200/50'
                        }`}>
                          <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Daily Breakdown</h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {cidAnalytics[selectedCidForAnalytics].daily_stats.map((day, index) => (
                              <div key={index} className="flex justify-between items-center text-xs">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {new Date(day.date).toLocaleDateString()}
                                </span>
                                <div className="flex space-x-4">
                                  <span className="font-medium">{day.requests} requests</span>
                                  <span className="text-gray-500">{formatSize(day.bytes_served)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ChartBarIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading analytics...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Modal - Optimized for mobile */}
      {renderFullscreenModal()}
    </div>
  );
};

export default SearchResults;
