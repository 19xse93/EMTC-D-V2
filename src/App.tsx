import React, { useState, useMemo, useEffect } from 'react';
import firebase, { db, auth, appId } from './firebase';
import { 
  UserPermissions, PurchaseOrder, ApvRecord, AppUser, AuditLog 
} from './types';
import { 
  formatCurrency, standardizeDate, safeParseDate, formatMonthLabel, 
  getAgingCategory, getAgingColor, getAgingBgColor, getWeekRange, 
  getDaysDiff, getDeliveryStatus, parseCSV, mapAccessLevelToPermissions 
} from './utils';

// Import Modular Subcomponents
import DashboardView from './components/DashboardView';
import PurchasesView from './components/PurchasesView';
import ApvsView from './components/ApvsView';
import TreasuryView from './components/TreasuryView';
import CashPositionView from './components/CashPositionView';
import AgingView from './components/AgingView';
import UserManagementView from './components/UserManagementView';
import SystemLogsView from './components/SystemLogsView';

// Lucide Icons
import { 
  LayoutDashboard, ShoppingCart, FileText, AlertCircle, Clock, CheckCircle, 
  DollarSign, Calendar, Building, Sparkles, Mail, Loader2, X, Check, Truck, 
  CalendarDays, Lock, Plus, Trash2, AlertTriangle, Activity, User as UserIcon, Wallet, 
  Edit3, Menu, Filter, Upload, Download, Search, Landmark, FileSignature, 
  PiggyBank, History, Shield, Paperclip, Eye, EyeOff 
} from 'lucide-react';

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'purchases' | 'apvs' | 'treasury' | 'funding' | 'aging' | 'users' | 'logs'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Core State
  const [user, setUser] = useState<firebase.User | null>(null);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [apvs, setApvs] = useState<ApvRecord[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [dbErrorMessage, setDbErrorMessage] = useState("");

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');

  // Authentication & Authorization
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(mapAccessLevelToPermissions(0)); 
  const [currentUserName, setCurrentUserName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Registration States
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerDepartment, setRegisterDepartment] = useState('Purchasing');

  // Modals & Action States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserAccount, setNewUserAccount] = useState<{ email: string; permissions: UserPermissions }>({ email: '', permissions: mapAccessLevelToPermissions(1) });
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isApvModalOpen, setIsApvModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isResetFundingModalOpen, setIsResetFundingModalOpen] = useState(false);
  const [apvToReset, setApvToReset] = useState<ApvRecord | null>(null);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [fundData, setFundData] = useState({ apvId: '', fundDate: '' });
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [checkApvId, setCheckApvId] = useState('');
  const [checkData, setCheckData] = useState({ checkNumber: '', checkDate: '', releaseDate: '', checkStatus: 'Pending Check' });
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [editingPoId, setEditingPoId] = useState<string | null>(null);
  const [newPo, setNewPo] = useState<PurchaseOrder>({ id: '', category: 'Freshman', prRequestor: '', processorName: '', prReceivedDate: '', date: '', expectedDelivery: '', receivedDate: '', vendor: '', description: '', amount: 0, grossAmount: 0, discountAmount: 0, paymentTerms: 'Terms', remarks: '', attachmentData: '', status: 'Pending' });
  const [newApv, setNewApv] = useState<ApvRecord>({ id: '', poId: '', businessUnit: 'ETMC', category: 'Freshman', vendor: '', invoiceDate: '', dueDate: '', amount: 0, funded: false, fundedDate: '', settledDate: '', paymentTerms: 'Terms', status: 'Unpaid', checkNumber: '', checkDate: '', releaseDate: '', checkStatus: 'Pending Check' });
  const [editingApvId, setEditingApvId] = useState<string | null>(null);
  const [receiveDate, setReceiveDate] = useState('');
  const [itemToDelete, setItemToDelete] = useState<{ type: 'PO' | 'APV' | null; id: string | null }>({ type: null, id: null });

  const [poStatusFilter, setPoStatusFilter] = useState('All');
  const [apvStatusFilter, setApvStatusFilter] = useState('All');
  const [treasuryStatusFilter, setTreasuryStatusFilter] = useState('All');
  const [importType, setImportType] = useState<'purchases' | 'apvs'>('purchases');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importingStatus, setImportingStatus] = useState('');

  const getDbRef = () => {
    return db.collection('artifacts').doc(appId).collection('public').doc('data');
  };

  const logAction = async (action: string, entityType: string, entityId: string, details: string) => {
    if (!auth.currentUser) return;
    try {
      const logEntry: AuditLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user: currentUserName || 'System',
        action: action, 
        entityType: entityType, 
        entityId: entityId,
        details: details
      };
      await getDbRef().collection('audit_logs').doc(logEntry.id).set(logEntry);
    } catch (e) { 
      console.warn("Failed to log action:", e); 
    }
  };

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = auth.onAuthStateChanged(async (u) => {
        if (u) {
          setUser(u as any);
          setIsLoggedIn(true);
          let email = u.email;
          if (email) {
            try {
              const userDoc = await getDbRef().collection('appUsers').doc(email.toLowerCase().trim()).get();
              if (userDoc.exists) {
                const data = userDoc.data() as any;
                setUserPermissions(data.permissions || mapAccessLevelToPermissions(data.accessLevel || 0));
              } else {
                setUserPermissions(mapAccessLevelToPermissions(3)); // Default Admin access
              }
              setCurrentUserName(email);
            } catch (e) {
              console.error("Access Level Fetch Failed", e);
              setUserPermissions(mapAccessLevelToPermissions(3)); 
              setCurrentUserName(email);
            }
          } else {
            setUserPermissions(mapAccessLevelToPermissions(3));
            setCurrentUserName('Admin (Canvas Preview)');
          }
        } else {
          setUser(null);
          setIsLoggedIn(false);
          setUserPermissions(mapAccessLevelToPermissions(0));
        }
        setIsDataLoading(false);
      });
    } catch (error: any) {
      console.error("Firebase SDK Initialization Error:", error);
      setDbError(true);
      setDbErrorMessage(error.message);
      setIsDataLoading(false);
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isLoggedIn) return;
    let unsubPurchases = () => {};
    let unsubApvs = () => {};
    let unsubUsers = () => {};
    let unsubLogs = () => {};
    
    try {
      const dbRef = getDbRef();
      
      unsubPurchases = dbRef.collection('purchases').onSnapshot(
        (snapshot) => {
          const loadedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
          setPurchases(loadedData.sort((a, b) => a.id.localeCompare(b.id)));
        },
        (error) => {
          setDbError(true);
          setDbErrorMessage(`Firestore Read Blocked: Check your Firebase Rules. (${error.message})`);
        }
      );

      unsubApvs = dbRef.collection('apvs').onSnapshot(
        (snapshot) => {
          const loadedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApvRecord));
          setApvs(loadedData.sort((a, b) => a.id.localeCompare(b.id)));
        },
        (error) => {
          setDbError(true);
          setDbErrorMessage(`Firestore Read Blocked: Check your Firebase Rules. (${error.message})`);
        }
      );

      unsubUsers = dbRef.collection('appUsers').onSnapshot(
        (snapshot) => {
          const loadedData = snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return { id: doc.id, ...data, permissions: data.permissions || mapAccessLevelToPermissions(data.accessLevel || 0) } as AppUser;
          });
          setAppUsers(loadedData);
        },
        (error) => { console.warn("Users listener error:", error); }
      );

      unsubLogs = dbRef.collection('audit_logs').onSnapshot(
        (snapshot) => {
          const loadedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
          setAuditLogs(loadedData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        },
        (error) => { console.warn("Logs listener error:", error); }
      );

    } catch (error: any) {
      console.error("Critical Firebase Error in useEffect:", error);
      setDbError(true);
      setDbErrorMessage(error.message);
    }

    return () => { unsubPurchases(); unsubApvs(); unsubUsers(); unsubLogs(); };
  }, [user, isLoggedIn]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    purchases.forEach(p => {
      if (p.date && typeof p.date === 'string') {
        const prefix = p.date.substring(0, 7);
        if (prefix.match(/^\d{4}-\d{2}$/)) months.add(prefix);
      }
    });
    apvs.forEach(a => {
      if (a.invoiceDate && typeof a.invoiceDate === 'string') {
        const prefix = a.invoiceDate.substring(0, 7);
        if (prefix.match(/^\d{4}-\d{2}$/)) months.add(prefix);
      }
    });
    return Array.from(months).sort().reverse();
  }, [purchases, apvs]);

  const baseFilteredPurchases = useMemo(() => {
    const query = globalSearchQuery.toLowerCase();
    return purchases.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchMonth = selectedMonth === 'All' || (p.date && p.date.startsWith(selectedMonth));
      const matchSearch = query === '' || 
        (p.id && p.id.toLowerCase().includes(query)) || 
        (p.vendor && p.vendor.toLowerCase().includes(query)) || 
        (p.processorName && p.processorName.toLowerCase().includes(query)) ||
        (p.prRequestor && p.prRequestor.toLowerCase().includes(query)) ||
        (p.remarks && p.remarks.toLowerCase().includes(query)) ||
        apvs.some(a => a.poId === p.id && ((a.id && a.id.toLowerCase().includes(query)) || (a.checkNumber && a.checkNumber.toLowerCase().includes(query))));
      return matchCat && matchMonth && matchSearch;
    });
  }, [purchases, apvs, selectedCategory, selectedMonth, globalSearchQuery]);

  const baseFilteredApvs = useMemo(() => {
    const query = globalSearchQuery.toLowerCase();
    return apvs.filter(a => {
      const matchCat = selectedCategory === 'All' || a.category === selectedCategory;
      const matchMonth = selectedMonth === 'All' || (a.invoiceDate && a.invoiceDate.startsWith(selectedMonth));
      const linkedPo = purchases.find(p => p.id === a.poId);
      const matchSearch = query === '' || 
        (a.id && a.id.toLowerCase().includes(query)) ||
        (a.poId && a.poId.toLowerCase().includes(query)) ||
        (a.vendor && a.vendor.toLowerCase().includes(query)) ||
        (a.checkNumber && a.checkNumber.toLowerCase().includes(query)) ||
        (linkedPo && ((linkedPo.remarks && linkedPo.remarks.toLowerCase().includes(query)) || (linkedPo.processorName && linkedPo.processorName.toLowerCase().includes(query)) || (linkedPo.prRequestor && linkedPo.prRequestor.toLowerCase().includes(query))));
      return matchCat && matchMonth && matchSearch;
    });
  }, [apvs, purchases, selectedCategory, selectedMonth, globalSearchQuery]);

  const tabFilteredPurchases = useMemo(() => baseFilteredPurchases.filter(p => poStatusFilter === 'All' || p.status === poStatusFilter), [baseFilteredPurchases, poStatusFilter]);
  const tabFilteredApvs = useMemo(() => baseFilteredApvs.filter(a => apvStatusFilter === 'All' || a.status === apvStatusFilter), [baseFilteredApvs, apvStatusFilter]);

  const filteredAuditLogs = useMemo(() => {
    const query = globalSearchQuery.toLowerCase();
    if (!query) return auditLogs;
    return auditLogs.filter(log => 
      (log.user && log.user.toLowerCase().includes(query)) ||
      (log.action && log.action.toLowerCase().includes(query)) ||
      (log.entityType && log.entityType.toLowerCase().includes(query)) ||
      (log.entityId && log.entityId.toLowerCase().includes(query)) ||
      (log.details && log.details.toLowerCase().includes(query))
    );
  }, [auditLogs, globalSearchQuery]);

  const { totalPurchases, totalSavings, totalOutstanding, totalPaidChecks, totalPendingChecks, agingSummary, vendorAging, avgProcessingTime, prToPoCompliance, weeklyNeedToPay, endOfWeek, avgOverallLeadTime, avgOverallVariance, supplierDeliveryList } = useMemo(() => {
    let tPurchases = 0; let tSavings = 0; let tOutstanding = 0;
    let tPaidChecks = 0; let tPendingChecks = 0;
    
    const currentDay = TODAY.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(TODAY); 
    startOfWeek.setDate(TODAY.getDate() + diffToMonday); 
    startOfWeek.setHours(0,0,0,0);
    const endOfCurrentWeek = new Date(startOfWeek); 
    endOfCurrentWeek.setDate(startOfWeek.getDate() + 4); 
    endOfCurrentWeek.setHours(23, 59, 59, 999);

    let totalProcessingDays = 0, processedCount = 0, withinTargetCount = 0;
    let totalDeliveryDays = 0, deliveryCount = 0;
    let totalVarianceDays = 0, varianceCount = 0;
    const vendorDeliveries: { [vendor: string]: { vendor: string; leadTotal: number; leadCount: number; needTotal: number; needCount: number } } = {};

    baseFilteredPurchases.forEach(p => {
      tPurchases += Number(p.amount || 0); 
      tSavings += Number(p.discountAmount || 0);
      
      if (p.prReceivedDate && p.date) {
        const diff = getDaysDiff(p.prReceivedDate, p.date);
        if (diff !== null && diff >= 0) {
          totalProcessingDays += diff;
          processedCount++;
          if (diff <= 3) withinTargetCount++;
        }
      }

      if (p.receivedDate) {
        const v = p.vendor || 'Unknown Vendor';
        if (!vendorDeliveries[v]) {
          vendorDeliveries[v] = { vendor: v, leadTotal: 0, leadCount: 0, needTotal: 0, needCount: 0 };
        }
        
        if (p.date) {
          const leadTime = getDaysDiff(p.date, p.receivedDate);
          if (leadTime !== null && leadTime >= 0) {
            totalDeliveryDays += leadTime;
            deliveryCount++;
            vendorDeliveries[v].leadTotal += leadTime;
            vendorDeliveries[v].leadCount++;
          }
        }

        if (p.expectedDelivery) {
          const needDiff = getDaysDiff(p.expectedDelivery, p.receivedDate);
          if (needDiff !== null) {
            totalVarianceDays += needDiff;
            varianceCount++;
            vendorDeliveries[v].needTotal += needDiff;
            vendorDeliveries[v].needCount++;
          }
        }
      }
    });

    const summary: { [cat: string]: number } = { 'Current': 0, '1-30 Days': 0, '31-60 Days': 0, '61-90 Days': 0, '> 90 Days': 0 };
    const weeklyNeed = { 'Current': 0, '1-30 Days': 0, '31-60 Days': 0, '61-90 Days': 0, '> 90 Days': 0, total: 0 };
    const vAging: { [v: string]: any } = {};

    baseFilteredApvs.forEach(apv => {
      const amt = Number(apv.amount || 0);
      if (apv.status === 'Unpaid') {
        tOutstanding += amt;
        if (apv.checkNumber || apv.checkStatus === 'Check Created' || apv.checkStatus === 'Prepared') {
          tPendingChecks += amt;
        }
        const category = getAgingCategory(apv.dueDate, apv.status, TODAY);
        if (summary[category] !== undefined) summary[category] += amt;
        
        const dueDateObj = safeParseDate(apv.dueDate) || new Date();
        if (dueDateObj <= endOfCurrentWeek) {
          if (weeklyNeed[category as keyof typeof weeklyNeed] !== undefined) {
            (weeklyNeed as any)[category] += amt;
          }
          weeklyNeed.total += amt;
        }
        if (!vAging[apv.vendor]) {
          vAging[apv.vendor] = { name: apv.vendor, total: 0, 'Current': 0, '1-30 Days': 0, '31-60 Days': 0, '61-90 Days': 0, '> 90 Days': 0 };
        }
        vAging[apv.vendor].total += amt;
        vAging[apv.vendor][category] += amt;
      } else if (apv.status === 'Paid') {
        tPaidChecks += amt;
      }
    });

    return { 
      totalPurchases: tPurchases, totalSavings: tSavings,
      totalOutstanding: tOutstanding, totalPaidChecks: tPaidChecks, totalPendingChecks: tPendingChecks,
      agingSummary: summary, vendorAging: Object.values(vAging).sort((a, b) => b.total - a.total),
      avgProcessingTime: processedCount > 0 ? (totalProcessingDays / processedCount).toFixed(1) : 0,
      prToPoCompliance: processedCount > 0 ? Math.round((withinTargetCount / processedCount) * 100) : 0,
      weeklyNeedToPay: weeklyNeed, endOfWeek: endOfCurrentWeek,
      avgOverallLeadTime: deliveryCount > 0 ? Math.round(totalDeliveryDays / deliveryCount) : 0,
      avgOverallVariance: varianceCount > 0 ? Math.round(totalVarianceDays / varianceCount) : 0,
      supplierDeliveryList: Object.values(vendorDeliveries)
        .filter(v => v.leadCount > 0 || v.needCount > 0)
        .map(v => ({
          vendor: v.vendor,
          avgLead: v.leadCount > 0 ? Math.round(v.leadTotal / v.leadCount) : null,
          avgNeed: v.needCount > 0 ? Math.round(v.needTotal / v.needCount) : null,
          totalOrders: Math.max(v.leadCount, v.needCount)
        })).sort((a, b) => b.totalOrders - a.totalOrders)
    };
  }, [baseFilteredPurchases, baseFilteredApvs]);

  const openFundModal = (apv: ApvRecord | null = null) => { 
    setFundData({ apvId: apv ? apv.id : '', fundDate: TODAY.toISOString().split('T')[0] }); 
    setIsFundModalOpen(true); 
  };

  const handleFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!user || !userPermissions.manageTreasury) return;
    const targetApv = apvs.find(a => a.id === fundData.apvId); 
    if (!targetApv) return;
    try { 
      await getDbRef().collection('apvs').doc(targetApv.id).update({ funded: true, fundedDate: fundData.fundDate }); 
      await logAction('FUND', 'APV', targetApv.id, `Allocated funds. Vendor: ${targetApv.vendor}, Amount: ${targetApv.amount}`);
      setIsFundModalOpen(false); 
    } catch(err: any) { 
      alert("Action Failed: " + err.message); 
    }
  };

  const handleUnfund = async (apv: ApvRecord) => {
    if (!user || !userPermissions.manageTreasury) return;
    try { 
      await getDbRef().collection('apvs').doc(apv.id).update({ funded: false, fundedDate: null }); 
      await logAction('UNFUND', 'APV', apv.id, `Removed funding state. Vendor: ${apv.vendor}`);
    } catch(err: any) { 
      alert("Action Failed: " + err.message); 
    }
  };

  const openCheckModal = (apv: ApvRecord | null = null) => {
    setCheckApvId(apv ? apv.id : '');
    setCheckData({ 
      checkNumber: apv?.checkNumber || '', 
      checkDate: apv?.checkDate || TODAY.toISOString().split('T')[0], 
      releaseDate: apv?.releaseDate || TODAY.toISOString().split('T')[0], 
      checkStatus: (apv?.checkStatus === 'Prepared' ? 'Check Created' : apv?.checkStatus) || 'Pending Check' 
    });
    setIsCheckModalOpen(true);
  };

  const handleCheckApvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; 
    setCheckApvId(val);
    const apv = apvs.find(a => a.id === val);
    if (apv) {
      setCheckData({ 
        checkNumber: apv.checkNumber || '', 
        checkDate: apv.checkDate || TODAY.toISOString().split('T')[0], 
        releaseDate: apv.releaseDate || TODAY.toISOString().split('T')[0], 
        checkStatus: (apv.checkStatus === 'Prepared' ? 'Check Created' : apv.checkStatus) || 'Pending Check' 
      });
    }
  };

  const handleSaveCheck = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!user || !userPermissions.manageTreasury) return;
    const targetApv = apvs.find(a => a.id === checkApvId); 
    if (!targetApv) return;
    const isCollected = checkData.checkStatus === 'Collected';
    
    const updates = { 
      checkNumber: checkData.checkNumber, 
      checkDate: checkData.checkDate, 
      releaseDate: isCollected ? checkData.releaseDate : null, 
      checkStatus: checkData.checkStatus, 
      status: isCollected ? 'Paid' : 'Unpaid', 
      settledDate: isCollected ? checkData.releaseDate : null
    };
    
    try { 
      await getDbRef().collection('apvs').doc(targetApv.id).update(updates); 
      await logAction('UPDATE_CHECK', 'APV', targetApv.id, `Status: ${checkData.checkStatus}, Check #: ${checkData.checkNumber}`);
      setIsCheckModalOpen(false); 
    } catch(err: any) { 
      alert("Action Failed: " + err.message); 
    }
  };

  const confirmResetFunding = (apv: ApvRecord) => { 
    setApvToReset(apv); 
    setIsResetFundingModalOpen(true); 
  };

  const executeResetFunding = async () => {
    if (!user || !userPermissions.manageTreasury || !apvToReset) return;
    const updates = { 
      funded: false, 
      fundedDate: null, 
      checkNumber: '', 
      checkDate: '', 
      releaseDate: null, 
      checkStatus: 'Pending Check', 
      status: 'Unpaid', 
      settledDate: null 
    };
    try { 
      await getDbRef().collection('apvs').doc(apvToReset.id).update(updates); 
      await logAction('RESET_FUNDING', 'APV', apvToReset.id, `Cleared all funding and check history.`);
      setIsResetFundingModalOpen(false); 
      setApvToReset(null); 
    } catch(err: any) { 
      alert("Action Failed: " + err.message); 
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { 
      alert("File is too large. Please select an image under 10MB."); 
      return; 
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; 
        const MAX_HEIGHT = 1200;
        let width = img.width; 
        let height = img.height;

        if (width > height && width > MAX_WIDTH) { 
          height *= MAX_WIDTH / width; 
          width = MAX_WIDTH; 
        } else if (height > MAX_HEIGHT) { 
          width *= MAX_HEIGHT / height; 
          height = MAX_HEIGHT; 
        }

        canvas.width = width; 
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF'; 
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setNewPo(prev => ({ ...prev, attachmentData: dataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const openEditPo = (po: PurchaseOrder) => { 
    setEditingPoId(po.id); 
    setNewPo({ 
      ...po, 
      category: po.category || 'Freshman', 
      prRequestor: po.prRequestor || '', 
      receivedDate: po.receivedDate || '', 
      amount: po.amount, 
      grossAmount: po.grossAmount || po.amount || 0, 
      discountAmount: po.discountAmount || 0, 
      paymentTerms: po.paymentTerms || 'Terms', 
      remarks: po.remarks || '', 
      attachmentData: po.attachmentData || '' 
    }); 
    setIsPoModalOpen(true); 
  };

  const openEditApv = (apv: ApvRecord) => { 
    setEditingApvId(apv.id); 
    setNewApv({ 
      ...apv, 
      businessUnit: apv.businessUnit || 'ETMC', 
      category: apv.category || 'Freshman', 
      amount: apv.amount, 
      paymentTerms: apv.paymentTerms || 'Terms', 
      status: apv.status || 'Unpaid', 
      settledDate: apv.settledDate || TODAY.toISOString().split('T')[0], 
      checkNumber: apv.checkNumber || '', 
      checkDate: apv.checkDate || '', 
      releaseDate: apv.releaseDate || '', 
      checkStatus: (apv.checkStatus === 'Prepared' ? 'Check Created' : apv.checkStatus) || 'Pending Check' 
    }); 
    setIsApvModalOpen(true); 
  };

  const openReceiveModal = (po: PurchaseOrder) => { 
    setSelectedPo(po); 
    setReceiveDate(TODAY.toISOString().split('T')[0]); 
    setIsReceiveModalOpen(true); 
  };

  const openAddPo = () => { 
    setEditingPoId(null); 
    setNewPo({ id: '', category: 'Freshman', prRequestor: '', processorName: '', prReceivedDate: '', date: '', expectedDelivery: '', receivedDate: null, vendor: '', description: '', amount: 0, grossAmount: 0, discountAmount: 0, paymentTerms: 'Terms', remarks: '', attachmentData: '', status: 'Pending' }); 
    setIsPoModalOpen(true); 
  };

  const handleAddPoSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!user || !userPermissions.managePo) return; 
    const poStatus = newPo.receivedDate ? 'Invoiced' : (editingPoId ? (purchases.find(p => p.id === editingPoId)?.status || 'Pending') : 'Pending');
    const action = editingPoId ? 'UPDATE' : 'CREATE';
    try {
      await getDbRef().collection('purchases').doc(newPo.id).set({ 
        ...newPo, 
        amount: Number(newPo.amount), 
        grossAmount: Number(newPo.grossAmount || newPo.amount), 
        discountAmount: Number(newPo.discountAmount || 0), 
        status: poStatus, 
        receivedDate: newPo.receivedDate || null, 
        attachmentData: newPo.attachmentData || null 
      });
      await logAction(action, 'PO', newPo.id, `Vendor: ${newPo.vendor}, Amount: ${newPo.amount}, Status: ${poStatus}`);
      setIsPoModalOpen(false); 
      setEditingPoId(null);
    } catch(err: any) { 
      alert("Action Failed: " + err.message); 
    }
  };

  const openAddApv = () => { 
    setEditingApvId(null); 
    setNewApv({ id: '', poId: '', businessUnit: 'ETMC', category: 'Freshman', vendor: '', invoiceDate: '', dueDate: '', amount: 0, funded: false, fundedDate: '', settledDate: TODAY.toISOString().split('T')[0], paymentTerms: 'Terms', status: 'Unpaid', checkNumber: '', checkDate: '', releaseDate: null, checkStatus: 'Pending Check' }); 
    setIsApvModalOpen(true); 
  };

  const handleAddApvSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!user || !userPermissions.manageApv) return; 
    const isPaid = newApv.status === 'Paid';
    const baseApv = { 
      ...newApv, 
      businessUnit: newApv.businessUnit || 'ETMC', 
      category: newApv.category || 'Freshman', 
      amount: Number(newApv.amount || 0), 
      status: newApv.status, 
      settledDate: isPaid ? newApv.settledDate : null 
    };
    if (isPaid) { 
      baseApv.funded = true; 
      if (!baseApv.fundedDate) baseApv.fundedDate = baseApv.settledDate || TODAY.toISOString().split('T')[0]; 
    }
    if (editingApvId) {
      const existing = apvs.find(a => a.id === editingApvId);
      if (existing) {
        baseApv.funded = isPaid ? true : existing.funded; 
        baseApv.fundedDate = isPaid ? (existing.fundedDate || baseApv.fundedDate) : existing.fundedDate;
        baseApv.checkNumber = existing.checkNumber || ''; 
        baseApv.checkDate = existing.checkDate || ''; 
        baseApv.releaseDate = existing.releaseDate || null; 
        baseApv.checkStatus = existing.checkStatus || 'Pending Check';
      }
    }
    const action = editingApvId ? 'UPDATE' : 'CREATE';
    try { 
      await getDbRef().collection('apvs').doc(newApv.id).set(baseApv); 
      await logAction(action, 'APV', newApv.id, `Linked PO: ${newApv.poId}, Amount: ${newApv.amount}`);
      setIsApvModalOpen(false); 
      setEditingApvId(null); 
    } catch(err: any) { 
      alert("Action Failed: " + err.message); 
    }
  };

  const handleDeletePo = (id: string) => { 
    if (user && userPermissions.deleteRecords) setItemToDelete({ type: 'PO', id });
  };
  
  const handleDeleteApv = (id: string) => { 
    if (user && userPermissions.deleteRecords) setItemToDelete({ type: 'APV', id });
  };

  const confirmDeleteItem = async () => {
    if (!user || !userPermissions.deleteRecords || !itemToDelete.id) return;
    const { type, id } = itemToDelete;
    try {
      if (type === 'PO') {
        await getDbRef().collection('purchases').doc(id).delete(); 
        await logAction('DELETE', 'PO', id, `Deleted record permanently.`);
      } else if (type === 'APV') {
        await getDbRef().collection('apvs').doc(id).delete(); 
        await logAction('DELETE', 'APV', id, `Deleted record permanently.`);
      }
    } catch(err: any) { 
      alert("Delete Failed: " + err.message); 
    }
    setItemToDelete({ type: null, id: null });
  };

  const handleReceivePoSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!user || !selectedPo || !userPermissions.managePo) return;
    try { 
      await getDbRef().collection('purchases').doc(selectedPo.id).update({ receivedDate: receiveDate, status: 'Invoiced' }); 
      await logAction('RECEIVE', 'PO', selectedPo.id, `Marked received on ${receiveDate}`);
      setIsReceiveModalOpen(false); 
      setSelectedPo(null); 
      setReceiveDate(''); 
    } catch(err: any) { 
      alert("Action Failed: " + err.message); 
    }
  };

  const handleClearAllData = async () => {
    if (!user || !userPermissions.systemAdmin) return;
    setIsClearing(true);
    try {
      const dbRef = getDbRef();
      const pSnap = await dbRef.collection('purchases').get();
      for (const doc of pSnap.docs) await doc.ref.delete();
      const aSnap = await dbRef.collection('apvs').get();
      for (const doc of aSnap.docs) await doc.ref.delete();
      await logAction('CLEAR_ALL', 'SYSTEM', 'DATABASE', `Wiped all POs and APVs from the system.`);
    } catch(err: any) { 
      alert("Clear Data Failed: " + err.message); 
    }
    setIsClearing(false); 
    setIsClearModalOpen(false);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userPermissions.manageUsers) return;
    try {
      const email = newUserAccount.email.toLowerCase().trim();
      if (!email) { 
        alert('Invalid email format'); 
        return; 
      }
      
      await getDbRef().collection('appUsers').doc(email).set({ 
        email: email, 
        permissions: newUserAccount.permissions 
      });
      await logAction('UPDATE_ACCESS', 'USER', email, `Updated custom access permissions.`);
      setIsUserModalOpen(false);
      setNewUserAccount({ email: '', permissions: mapAccessLevelToPermissions(1) });
    } catch(err: any) { 
      alert("Failed to save user access: " + err.message); 
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (user && userPermissions.manageUsers) {
      if (confirm(`Remove custom access level for ${email}?`)) {
        try { 
          await getDbRef().collection('appUsers').doc(email).delete(); 
          await logAction('REMOVE_ACCESS', 'USER', email, `Revoked specific access level.`);
        } catch(err: any) { 
          alert("Delete Failed: " + err.message); 
        }
      }
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!user || !userPermissions.systemAdmin || !importFile) return;
    setImportingStatus('Parsing CSV file...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string; 
        const parsedData = parseCSV(text);
        if (parsedData.length === 0) throw new Error("File is empty or incorrectly formatted.");
        setImportingStatus(`Uploading ${parsedData.length} records. Please wait...`);
        
        const dbRef = getDbRef().collection(importType);
        let successCount = 0;
        for (let item of parsedData) {
          if (!item.id) continue; 
          item.amount = Number(item.amount?.replace(/[^0-9.-]+/g,"") || 0);
          let cleanBU = (item.businessUnit || '').toUpperCase().trim();
          item.businessUnit = ['ETMC', 'EMI', 'EHI'].includes(cleanBU) ? cleanBU : 'ETMC';
          item.category = item.category || 'Freshman'; 
          
          if (importType === 'purchases') {
            item.prReceivedDate = standardizeDate(item.prReceivedDate);
            item.date = standardizeDate(item.date);
            item.expectedDelivery = standardizeDate(item.expectedDelivery);
            item.receivedDate = standardizeDate(item.receivedDate);

            item.grossAmount = Number(item.grossAmount?.replace(/[^0-9.-]+/g,"") || item.amount);
            item.discountAmount = Number(item.discountAmount?.replace(/[^0-9.-]+/g,"") || 0);
            item.paymentTerms = item.paymentTerms || 'Terms'; 
            item.status = item.receivedDate ? 'Invoiced' : 'Pending';
            item.remarks = item.remarks || ''; 
            item.prRequestor = item.prRequestor || ''; 
          } else {
            item.invoiceDate = standardizeDate(item.invoiceDate);
            item.dueDate = standardizeDate(item.dueDate);
            item.settledDate = standardizeDate(item.settledDate);
            item.fundedDate = standardizeDate(item.fundedDate);
            item.checkDate = standardizeDate(item.checkDate);
            item.releaseDate = standardizeDate(item.releaseDate);

            item.funded = String(item.funded).toLowerCase() === 'true' || item.status === 'Paid';
            if (item.funded && !item.fundedDate) item.fundedDate = item.settledDate || TODAY.toISOString().split('T')[0];
            item.status = item.status || 'Unpaid'; 
            item.paymentTerms = item.paymentTerms || 'Terms';
            item.checkNumber = item.checkNumber || ''; 
            item.checkStatus = item.checkStatus || 'Pending Check';
          }
          await dbRef.doc(item.id).set(item, { merge: true });
          successCount++;
        }
        await logAction('IMPORT', 'BATCH', importType.toUpperCase(), `Imported ${successCount} records via CSV.`);
        setImportingStatus(`Success! Uploaded ${successCount} records.`);
        setTimeout(() => { setIsImportModalOpen(false); setImportFile(null); setImportingStatus(''); }, 2000);
      } catch (error) { 
        console.error(error); 
        setImportingStatus('Error formatting CSV. Ensure columns match exactly.'); 
      }
    };
    reader.onerror = () => setImportingStatus('Failed to read file.');
    reader.readAsText(importFile);
  };

  const handleExportCompleteReport = () => {
    if (!purchases.length && !apvs.length) { 
      alert("No data available to export."); 
      return; 
    }

    let csvContent = "\uFEFF"; // BOM for Excel
    const headers = [
      "APV Reference", "PO Reference", "Vendor", "Business Unit", "Category",
      "PR Requestor", "Processor", "PO Issue Date", "Expected Delivery", "Actual Received Date", 
      "PO Amount", "Discount Saved", "APV Invoice Date", "APV Due Date", "APV Amount",
      "APV Status", "Aging Category", "Check Number", "Check Status", "Release/Settled Date",
      "Payment Terms", "Remarks/Description"
    ];
    csvContent += headers.join(",") + "\r\n";

    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return '""';
      const stringified = String(str);
      if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
        return `"${stringified.replace(/"/g, '""')}"`;
      }
      return stringified;
    };

    const exportedApvIds = new Set<string>();

    purchases.forEach(po => {
      const linkedApvs = apvs.filter(a => a.poId === po.id);
      
      if (linkedApvs.length > 0) {
        linkedApvs.forEach(apv => {
          exportedApvIds.add(apv.id);
          const aging = getAgingCategory(apv.dueDate, apv.status, TODAY);
          const row = [
            apv.id, po.id, apv.vendor, apv.businessUnit || 'ETMC', apv.category || po.category,
            po.prRequestor, po.processorName, po.date, po.expectedDelivery, po.receivedDate,
            po.amount, po.discountAmount, apv.invoiceDate, apv.dueDate, apv.amount,
            apv.status, aging, apv.checkNumber, apv.checkStatus, apv.settledDate || apv.releaseDate,
            apv.paymentTerms, (po.description || '') + (po.remarks ? " - " + po.remarks : "")
          ];
          csvContent += row.map(escapeCSV).join(",") + "\r\n";
        });
      } else {
        const row = [
          "NO APV YET", po.id, po.vendor, "ETMC", po.category,
          po.prRequestor, po.processorName, po.date, po.expectedDelivery, po.receivedDate,
          po.amount, po.discountAmount, "", "", "",
          "Pending APV", "", "", "", "",
          po.paymentTerms, (po.description || '') + (po.remarks ? " - " + po.remarks : "")
        ];
        csvContent += row.map(escapeCSV).join(",") + "\r\n";
      }
    });

    apvs.forEach(apv => {
      if (!exportedApvIds.has(apv.id)) {
        const aging = getAgingCategory(apv.dueDate, apv.status, TODAY);
        const row = [
          apv.id, apv.poId || "NO PO", apv.vendor, apv.businessUnit || 'ETMC', apv.category,
          "", "", "", "", "",
          "", "", apv.invoiceDate, apv.dueDate, apv.amount,
          apv.status, aging, apv.checkNumber, apv.checkStatus, apv.settledDate || apv.releaseDate,
          apv.paymentTerms, ""
        ];
        csvContent += row.map(escapeCSV).join(",") + "\r\n";
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ETMC_Complete_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    logAction('EXPORT', 'SYSTEM', 'REPORT', 'Exported complete data report to CSV.');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDataLoading(true);
    setLoginError(false);
    setDbErrorMessage("");

    try {
      await auth.signInWithEmailAndPassword(loginEmail, loginPassword);
    } catch (error: any) {
      console.error("Authentication Error:", error);
      setLoginError(true);
      if(error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setDbErrorMessage("Incorrect email or password.");
      } else {
        setDbErrorMessage(error.message);
      }
      setIsDataLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDataLoading(true);
    setLoginError(false);
    setDbErrorMessage("");

    try {
      await auth.createUserWithEmailAndPassword(registerEmail, registerPassword);
      let defaultAccess = 0;
      if (registerDepartment === 'Purchasing') defaultAccess = 2; // Level 2
      else if (registerDepartment === 'AP') defaultAccess = 2; // Level 2
      else if (registerDepartment === 'Treasury') defaultAccess = 4; // Treasury Focus
      else if (registerDepartment === 'Business Development') defaultAccess = 0; // Guest

      const emailToSave = registerEmail.toLowerCase().trim();
      await getDbRef().collection('appUsers').doc(emailToSave).set({
        email: emailToSave,
        name: registerName,
        department: registerDepartment,
        permissions: mapAccessLevelToPermissions(defaultAccess),
        createdAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Registration Error:", error);
      setLoginError(true);
      setDbErrorMessage(error.message);
      setIsDataLoading(false);
    }
  };

  const handleSignOut = async () => {
    try { 
      await auth.signOut(); 
    } catch(e) { 
      console.error("Sign out error", e); 
    }
  };

  const renderHeaderBadge = () => {
    if (userPermissions.systemAdmin) return <span className="text-emerald-600 flex items-center bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 text-xs font-sans font-bold"><Check size={12} className="mr-1" /> Super Admin</span>;
    if (userPermissions.manageTreasury) return <span className="text-amber-600 flex items-center bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0 text-xs font-semibold"><Landmark size={12} className="mr-1" /> Treasury</span>;
    if (userPermissions.managePo || userPermissions.manageApv) return <span className="text-indigo-600 flex items-center bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 shrink-0 text-xs font-sans font-semibold"><UserIcon size={12} className="mr-1" /> Core Staff</span>;
    return <span className="text-slate-500 flex items-center bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0 text-xs font-semibold"><Lock size={12} className="mr-1" /> View Only</span>;
  };

  if (isDataLoading && !dbError) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 flex-col px-4 text-center">
        <Loader2 size={48} className="animate-spin text-indigo-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800">Checking Security Credentials...</h2>
        <p className="text-gray-500 text-sm mt-2 flex items-center justify-center"><Lock size={14} className="mr-1" /> Connecting to Authentication Server</p>
      </div>
    );
  }

  if (!isLoggedIn && !dbError) {
    return (
      <div className="min-h-screen flex flex-col justify-center p-4" style={{ backgroundColor: '#11243E' }}>
        <div className="mb-8 w-full max-w-md mx-auto flex flex-col items-center justify-center">
          <div className="text-white text-3xl font-black tracking-widest uppercase flex items-center gap-2 mb-2 font-mono">
            <span>ETMC</span>
            <span className="text-indigo-400 font-sans font-light">elev8</span>
          </div>
          <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">APV AGING DASHBOARD</span>
        </div>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto p-8 relative overflow-hidden">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-gray-500 text-sm mt-1">{isRegistering ? 'Register for your department dashboard' : 'Please sign in to your dashboard'}</p>
          </div>
          
          {loginError && (
            <div className="bg-red-50 text-red-600 p-3 mb-4 rounded-lg text-sm text-center font-medium border border-red-200">
              {dbErrorMessage || 'Authentication Failed'}
            </div>
          )}
          
          {!isRegistering ? (
            <form className="space-y-5" onSubmit={handleLoginSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 block">Email Address</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-gray-400"><Mail size={18} /></div>
                  <input required type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#11243E] focus:border-[#11243E] outline-none transition-all text-sm" placeholder="you@company.com" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 block">Password</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-gray-400"><Lock size={18} /></div>
                  <input required type={showPassword ? "text" : "password"} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#11243E] focus:border-[#11243E] outline-none transition-all text-sm" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />} 
                  </button>
                </div>
              </div>

              <button type="submit" className="w-full bg-[#11243E] hover:bg-[#1a355a] text-white font-semibold py-3 rounded-lg transition-colors duration-200 shadow-md mt-2 cursor-pointer">
                Sign In
              </button>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">Don't have an account? <button type="button" onClick={() => { setIsRegistering(true); setLoginError(false); }} className="text-indigo-600 font-bold hover:underline cursor-pointer">Sign up</button></p>
              </div>
              
              <div className="mt-2 pt-4 border-t border-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                <Shield size={12} className="mr-1" /> Protected by Firebase Authentication
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 block uppercase tracking-wider">Full Name</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-gray-400"><UserIcon size={16} /></div>
                  <input required type="text" value={registerName} onChange={e => setRegisterName(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#11243E] focus:border-[#11243E] outline-none transition-all text-sm animate-in" placeholder="Juan Dela Cruz" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 block uppercase tracking-wider">Department</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-gray-400"><Building size={16} /></div>
                  <select required value={registerDepartment} onChange={e => setRegisterDepartment(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#11243E] focus:border-[#11243E] outline-none transition-all text-sm bg-white cursor-pointer">
                    <option value="Purchasing">Purchasing</option>
                    <option value="AP">Accounts Payable (AP)</option>
                    <option value="Treasury">Treasury</option>
                    <option value="Business Development">Procurement</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 block uppercase tracking-wider">Email Address</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-gray-400"><Mail size={16} /></div>
                  <input required type="email" value={registerEmail} onChange={e => setRegisterEmail(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#11243E] focus:border-[#11243E] outline-none transition-all text-sm font-sans" placeholder="you@company.com" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 block uppercase tracking-wider">Password</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-gray-400"><Lock size={16} /></div>
                  <input required type="password" value={registerPassword} onChange={e => setRegisterPassword(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#11243E] focus:border-[#11243E] outline-none transition-all text-sm font-mono" placeholder="At least 6 characters" minLength={6} />
                </div>
              </div>

              <button type="submit" className="w-full bg-[#11243E] hover:bg-[#1a355a] text-white font-semibold py-3 rounded-lg transition-colors duration-200 shadow-md mt-2 cursor-pointer">
                Register Account
              </button>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">Already have an account? <button type="button" onClick={() => { setIsRegistering(false); setLoginError(false); }} className="text-indigo-600 font-bold hover:underline cursor-pointer">Log in</button></p>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden relative">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 text-slate-300 flex flex-col transform transition-transform md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: '#11243E' }}>
        <div className="p-5 flex items-center justify-center border-b border-white/10 bg-transparent">
          <div className="flex flex-col items-center justify-center w-full">
            <span className="text-white text-2xl font-black tracking-widest font-mono">ETMC <span className="text-indigo-400 font-light font-sans text-xl">elev8</span></span>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-left text-xs font-semibold tracking-wider cursor-pointer transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50' : 'hover:bg-white/5 text-slate-350'}`}>
            <LayoutDashboard className="mr-3" size={18} /> Dashboard
          </button>
          <button onClick={() => { setActiveTab('purchases'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-left text-xs font-semibold tracking-wider cursor-pointer transition-all ${activeTab === 'purchases' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-white/5'}`}>
            <ShoppingCart className="mr-3" size={18} /> Purchase Orders
          </button>
          <button onClick={() => { setActiveTab('apvs'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-left text-xs font-semibold tracking-wider cursor-pointer transition-all ${activeTab === 'apvs' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-white/5'}`}>
            <FileText className="mr-3" size={18} /> APV Records
          </button>
          <button onClick={() => { setActiveTab('treasury'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-left text-xs font-semibold tracking-wider cursor-pointer transition-all ${activeTab === 'treasury' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-white/5'}`}>
            <Wallet className="mr-3" size={18} /> Treasury Records
          </button>
          <button onClick={() => { setActiveTab('funding'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-left text-xs font-semibold tracking-wider cursor-pointer transition-all ${activeTab === 'funding' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-white/5'}`}>
            <CalendarDays className="mr-3" size={18} /> Cash Position Report
          </button>
          <button onClick={() => { setActiveTab('aging'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-left text-xs font-semibold tracking-wider cursor-pointer transition-all ${activeTab === 'aging' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-white/5'}`}>
            <Clock className="mr-3" size={18} /> Aging Report
          </button>
          
          {(userPermissions.manageUsers || userPermissions.systemAdmin) && (
            <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
              {userPermissions.manageUsers && (
                <button onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-left text-xs font-semibold tracking-wider cursor-pointer transition-all ${activeTab === 'users' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-white/5'}`}>
                  <UserIcon className="mr-3" size={18} /> User Management
                </button>
              )}
              {userPermissions.systemAdmin && (
                <button onClick={() => { setActiveTab('logs'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg text-left text-xs font-semibold tracking-wider cursor-pointer transition-all ${activeTab === 'logs' ? 'bg-purple-600 text-white shadow-md' : 'hover:bg-white/5'}`}>
                  <History className="mr-3" size={18} /> System Logs
                </button>
              )}
            </div>
          )}
        </nav>
        <div className="p-6 bg-black/15 mt-auto shrink-0 space-y-2">
          {userPermissions.exportData && (
            <button onClick={handleExportCompleteReport} className="w-full flex items-center justify-center px-4 py-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg text-xs font-bold transition-colors cursor-pointer">
              <Download size={14} className="mr-2" /> Export Report (CSV)
            </button>
          )}

          {userPermissions.systemAdmin && (
            <>
              <button onClick={() => setIsImportModalOpen(true)} className="w-full flex items-center justify-center px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                <Upload size={14} className="mr-2" /> Import Data (CSV)
              </button>
              <button onClick={() => setIsClearModalOpen(true)} className="w-full flex items-center justify-center px-4 py-2 bg-white/5 hover:bg-red-500/30 hover:text-red-300 text-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                <Trash2 size={14} className="mr-2" /> Clear All Data
              </button>
            </>
          )}
          
          <button onClick={handleSignOut} className="w-full flex items-center justify-center px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer">
            <Lock size={14} className="mr-2" /> Sign Out
          </button>

          <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Logged in as</div>
          <div className="text-xs font-medium text-slate-200 flex items-center truncate mb-3" title={currentUserName}><UserIcon size={12} className="mr-2 shrink-0"/> <span className="truncate">{currentUserName}</span></div>

          <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">System Date</div>
          <div className="text-xs font-medium text-slate-200 flex items-center truncate"><Calendar size={12} className="mr-2 shrink-0"/> {TODAY.toLocaleDateString()}</div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto w-full flex flex-col">
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 sticky top-0 z-10 shadow-sm flex flex-col lg:flex-row justify-between lg:items-center gap-3">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center">
              <button className="lg:hidden mr-3 cursor-pointer" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={24} />
              </button>
              <h2 className="text-lg md:text-xl font-bold text-gray-800 capitalize truncate font-sans">
                {activeTab === 'apvs' ? 'Accounts Payable' : activeTab.replace('-', ' ')}
              </h2>
            </div>
            <div className="block lg:hidden">{renderHeaderBadge()}</div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
            <div className="hidden lg:block">{renderHeaderBadge()}</div>
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={14} className="text-gray-400" />
              </div>
              <input type="text" placeholder="Global Search..." title="Search across PO, Vendor, Remarks, APV, or Check Details" value={globalSearchQuery} onChange={e => setGlobalSearchQuery(e.target.value)} className="w-full bg-white border border-gray-300 text-[10px] md:text-sm font-medium rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-8 pr-3 py-2 outline-none transition-colors shadow-sm" />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="flex-1 sm:flex-none bg-white border border-gray-300 text-[10px] md:text-sm font-medium rounded-lg p-2 outline-none shadow-sm cursor-pointer hover:bg-gray-50" title="Filter by Month">
                <option value="All">All Months (YTD)</option>
                {availableMonths.map(m => (<option key={m} value={m}>{formatMonthLabel(m)}</option>))}
              </select>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="flex-1 sm:flex-none bg-white border border-gray-300 text-[10px] md:text-sm font-medium rounded-lg p-2 outline-none cursor-pointer hover:bg-gray-50 shadow-sm" title="Filter by Category">
                <option value="All">All Categories</option>
                <option value="Freshman">Freshman</option>
                <option value="Trading">Trading</option>
              </select>
            </div>
          </div>
        </header>
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
          {activeTab === 'dashboard' && (
            <DashboardView 
              purchases={tabFilteredPurchases} 
              apvs={tabFilteredApvs}
              dbError={dbError}
              dbErrorMessage={dbErrorMessage}
              totalPurchases={totalPurchases}
              totalSavings={totalSavings}
              totalOutstanding={totalOutstanding}
              totalPaidChecks={totalPaidChecks}
              totalPendingChecks={totalPendingChecks}
              pastDuePayables={totalOutstanding - agingSummary['Current']}
              prToPoCompliance={prToPoCompliance}
              avgProcessingTime={avgProcessingTime}
              avgOverallLeadTime={avgOverallLeadTime}
              avgOverallVariance={avgOverallVariance}
              supplierDeliveryList={supplierDeliveryList}
            />
          )}
          {activeTab === 'purchases' && (
            <PurchasesView 
              purchases={tabFilteredPurchases}
              apvs={apvs}
              userPermissions={userPermissions}
              poStatusFilter={poStatusFilter}
              setPoStatusFilter={setPoStatusFilter}
              openAddPo={openAddPo}
              openEditPo={openEditPo}
              openReceiveModal={openReceiveModal}
              handleDeletePo={handleDeletePo}
              setViewingImage={setViewingImage}
              today={TODAY}
            />
          )}
          {activeTab === 'apvs' && (
            <ApvsView 
              apvs={tabFilteredApvs}
              userPermissions={userPermissions}
              apvStatusFilter={apvStatusFilter}
              setApvStatusFilter={setApvStatusFilter}
              openAddApv={openAddApv}
              openEditApv={openEditApv}
              handleDeleteApv={handleDeleteApv}
              today={TODAY}
            />
          )}
          {activeTab === 'treasury' && (
            <TreasuryView 
              apvs={tabFilteredApvs}
              userPermissions={userPermissions}
              treasuryStatusFilter={treasuryStatusFilter}
              setTreasuryStatusFilter={setTreasuryStatusFilter}
              openFundModal={openFundModal}
              openCheckModal={openCheckModal}
              handleUnfund={handleUnfund}
              earmarkedAmt={totalOutstanding}
              preparedAmt={totalPendingChecks}
              releasedAmt={totalPaidChecks}
            />
          )}
          {activeTab === 'funding' && (
            <CashPositionView 
              apvs={tabFilteredApvs}
              userPermissions={userPermissions}
              confirmResetFunding={confirmResetFunding}
              today={TODAY}
            />
          )}
          {activeTab === 'aging' && (
            <AgingView 
              apvs={tabFilteredApvs}
              userPermissions={userPermissions}
              agingSummary={agingSummary}
              weeklyNeedToPay={weeklyNeedToPay}
              vendorAging={vendorAging}
              endOfWeek={endOfWeek}
              today={TODAY}
            />
          )}
          {activeTab === 'users' && userPermissions.manageUsers && (
            <UserManagementView 
              appUsers={appUsers}
              userPermissions={userPermissions}
              setNewUserAccount={setNewUserAccount}
              openUserModal={() => setIsUserModalOpen(true)}
              handleDeleteUser={handleDeleteUser}
            />
          )}
          {activeTab === 'logs' && userPermissions.systemAdmin && (
            <SystemLogsView logs={filteredAuditLogs} />
          )}
        </div>
      </main>

      {/* Item Permanent Deletion Dialog */}
      {itemToDelete.id && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border-t-4 border-red-500">
            <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h3 className="font-semibold text-red-800 flex items-center text-sm md:text-base">
                <AlertTriangle size={18} className="mr-2" /> Delete {itemToDelete.type}
              </h3>
              <button onClick={() => setItemToDelete({ type: null, id: null })} className="text-red-400 hover:text-red-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-4 md:p-6 space-y-4 text-center">
              <p className="text-sm md:text-base text-gray-700">Are you sure you want to permanently delete {itemToDelete.type === 'PO' ? 'Purchase Order' : 'APV'} <strong className="whitespace-nowrap">{itemToDelete.id}</strong>?</p>
              <p className="text-xs md:text-sm text-red-600 font-bold bg-red-50 p-2 rounded border border-red-200">This action cannot be undone and will be permanently logged.</p>
            </div>
            <div className="px-4 md:px-6 py-4 bg-gray-50 flex flex-col-reverse xs:flex-row justify-end xs:space-x-3">
              <button onClick={() => setItemToDelete({ type: null, id: null })} className="w-full xs:w-auto px-4 py-2 mt-2 xs:mt-0 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer">Cancel</button>
              <button onClick={confirmDeleteItem} className="w-full xs:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center cursor-pointer">Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* User Access Update Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm md:text-base flex items-center"><UserIcon className="mr-2 text-indigo-600" size={18} /> Update User Access</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddUserSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address (Registered in Firebase)</label>
                <input required type="email" value={newUserAccount.email} onChange={e => setNewUserAccount({...newUserAccount, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="user@company.com" />
              </div>
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide border-b pb-1">Access Level Selection</label>
                
                {(() => {
                  const isViewOnly = !Object.values(newUserAccount.permissions || {}).some(v => v);
                  return (
                    <>
                      <div className={`flex items-start p-2.5 rounded border mb-2 cursor-pointer transition-colors ${isViewOnly ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`} onClick={() => setNewUserAccount({...newUserAccount, permissions: { managePo: false, manageApv: false, manageTreasury: false, deleteRecords: false, manageUsers: false, systemAdmin: false, exportData: false }})}>
                        <div className="flex items-center h-5">
                          <input id="role-viewOnly" type="radio" checked={isViewOnly} readOnly className="w-4 h-4 text-indigo-600 bg-white border-gray-300 focus:ring-indigo-500" />
                        </div>
                        <div className="ml-2 text-sm">
                          <label htmlFor="role-viewOnly" className="font-bold text-slate-800">View Only</label>
                          <p className="text-[10px] text-slate-500 mt-0.5">Read-only access. Cannot create, edit, or delete any records.</p>
                        </div>
                      </div>

                      <div className={`flex items-start p-2.5 rounded border mb-3 transition-colors ${!isViewOnly ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                        <div className="flex items-center h-5 mt-1 cursor-pointer" onClick={() => { if(isViewOnly) setNewUserAccount({...newUserAccount, permissions: { managePo: true, manageApv: false, manageTreasury: false, deleteRecords: false, manageUsers: false, systemAdmin: false, exportData: false }}) }}>
                          <input id="role-custom" type="radio" checked={!isViewOnly} readOnly className="w-4 h-4 text-indigo-600 bg-white border-gray-300 focus:ring-indigo-500" />
                        </div>
                        <div className="ml-2 text-sm w-full">
                          <label htmlFor="role-custom" className="font-bold text-slate-800 block">Custom Access</label>
                          <p className="text-[10px] text-slate-500 mt-0.5 mb-3">Select specific permissions for this user.</p>
                          
                          <div className={`space-y-2 pt-3 border-t border-indigo-100 transition-opacity duration-200 ${isViewOnly ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                            {[
                              { key: 'managePo', label: 'Manage Purchase Orders', desc: 'Create, Edit, Receive POs' },
                              { key: 'manageApv', label: 'Manage APV Records', desc: 'Create, Edit APVs' },
                              { key: 'manageTreasury', label: 'Treasury Operations', desc: 'Fund APVs, Create Checks' },
                              { key: 'deleteRecords', label: 'Delete Records', desc: 'Permanently delete POs & APVs' },
                              { key: 'manageUsers', label: 'User Management', desc: 'Add/Edit user access controls' },
                              { key: 'systemAdmin', label: 'System Administrator', desc: 'Import CSV, Clear Data, View Logs' },
                              { key: 'exportData', label: 'Export Data', desc: 'Download CSV reports' }
                            ].map(item => (
                              <div key={item.key} className="flex items-start">
                                <div className="flex items-center h-5">
                                  <input id={`perm-${item.key}`} type="checkbox" checked={(newUserAccount.permissions as any)[item.key] || false} onChange={e => setNewUserAccount({...newUserAccount, permissions: {...newUserAccount.permissions, [item.key]: e.target.checked}})} className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" />
                                </div>
                                <div className="ml-2 text-sm">
                                  <label htmlFor={`perm-${item.key}`} className="font-medium text-gray-700 cursor-pointer">{item.label}</label>
                                  <p className="text-[10px] text-gray-500">{item.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">Save Access</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center"><Download size={18} className="mr-2 text-emerald-600"/> Import Data (CSV)</h3>
              <button onClick={() => { setIsImportModalOpen(false); setImportingStatus(''); }} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleImportSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">1. Select Data Type</label>
                <select value={importType} onChange={e => setImportType(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-50 bg-white cursor-pointer">
                  <option value="purchases">Purchase Orders</option>
                  <option value="apvs">APV Records</option>
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wide mb-1 flex items-center"><AlertCircle size={12} className="mr-1"/> Required CSV Headers</label>
                <p className="text-xs text-blue-700 font-mono break-all">{importType === 'purchases' ? "id, businessUnit, category, prReceivedDate, date, expectedDelivery, receivedDate, vendor, description, amount, grossAmount, discountAmount, paymentTerms, prRequestor, processorName, remarks" : "id, poId, businessUnit, category, vendor, invoiceDate, dueDate, amount, paymentTerms, status, settledDate"}</p>
                <p className="text-[10px] text-blue-600 mt-2 font-bold italic border-t border-blue-200 pt-2"><Sparkles size={10} className="inline mr-1" /> Smart Date Parser is active! Supported formats include YYYY-MM-DD, MM/DD/YYYY, and raw Excel index days.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">2. Upload File</label>
                <input required type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
              </div>
              {importingStatus && (
                <div className={`p-3 rounded-lg text-xs font-medium text-center ${importingStatus.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>{importingStatus}</div>
              )}
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => { setIsImportModalOpen(false); setImportingStatus(''); }} className="px-4 py-2 text-sm font-medium text-gray-500 cursor-pointer">Cancel</button>
                <button type="submit" disabled={!!importingStatus && !importingStatus.includes('Error')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center cursor-pointer"><Upload size={16} className="mr-2"/> Import</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Funding Dialog Overlay */}
      {isFundModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm md:text-base flex items-center"><Landmark className="mr-2 text-indigo-600" size={18} /> For Funding</h3>
              <button onClick={() => setIsFundModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleFundSubmit} className="p-4 md:p-6 space-y-4">
              <div className="text-sm text-gray-600 mb-2">Specify the funding date to allocate cash position. You can set this to a future date for advance funding.</div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">APV Number</label>
                <input required list="unpaid-apvs" value={fundData.apvId} onChange={e => setFundData({...fundData, apvId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Search or type APV Number" />
              </div>
              {(() => {
                const match = apvs.find(a => a.id === fundData.apvId);
                if (match) {
                  return (
                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-xs">
                      <div className="flex justify-between mb-1"><span className="text-indigo-800 font-bold">Vendor:</span> <span>{match.vendor}</span></div>
                      <div className="flex justify-between"><span className="text-indigo-800 font-bold">Amount:</span> <span className="font-black">{formatCurrency(match.amount)}</span></div>
                    </div>
                  );
                }
                return null;
              })()}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Funding Date</label>
                <input required type="date" value={fundData.fundDate} onChange={e => setFundData({...fundData, fundDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
              </div>
              <div className="pt-4 flex flex-col-reverse xs:flex-row justify-end xs:space-x-3">
                <button type="button" onClick={() => setIsFundModalOpen(false)} className="w-full xs:w-auto px-4 py-2 mt-2 xs:mt-0 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={!apvs.some(a => a.id === fundData.apvId)} className="w-full xs:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check Assignment Overlay */}
      {isCheckModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm md:text-base flex items-center"><FileSignature className="mr-2 text-indigo-600" size={18} /> Update Check Details</h3>
              <button onClick={() => setIsCheckModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveCheck} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">APV Number</label>
                <input required list="unpaid-apvs" value={checkApvId} onChange={handleCheckApvChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Search or type APV Number" />
              </div>
              {(() => {
                const match = apvs.find(a => a.id === checkApvId);
                if (match) {
                  return (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 text-xs">
                      <div className="flex justify-between mb-1"><span className="text-slate-500 uppercase font-bold text-[10px]">Vendor:</span> <span className="font-medium">{match.vendor}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 uppercase font-bold text-[10px]">Amount:</span> <span className="font-black text-indigo-700">{formatCurrency(match.amount)}</span></div>
                    </div>
                  );
                }
                return null;
              })()}
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Check Status</label>
                <select required value={checkData.checkStatus} onChange={e => setCheckData({...checkData, checkStatus: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer">
                  <option value="Pending Check">Pending Check Generation</option>
                  <option value="Check Created">Check Created</option>
                  <option value="Collected">Collected / Released</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Check Number</label>
                  <input type="text" value={checkData.checkNumber} onChange={e => setCheckData({...checkData, checkNumber: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. CHK-12345" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Check Date</label>
                  <input type="date" value={checkData.checkDate} onChange={e => setCheckData({...checkData, checkDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                </div>
              </div>
              {checkData.checkStatus === 'Collected' && (
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wide mb-1">Release / Collection Date</label>
                  <input required type="date" value={checkData.releaseDate} onChange={e => setCheckData({...checkData, releaseDate: e.target.value})} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                  <p className="text-[10px] text-emerald-600 mt-2 italic">Note: Marking as collected will automatically resolve the APV as "Paid".</p>
                </div>
              )}
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsCheckModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={!apvs.some(a => a.id === checkApvId)} className="px-4 py-2 bg-indigo-600 text-white disabled:opacity-50 rounded-lg text-sm font-medium transition-colors hover:bg-indigo-700 cursor-pointer">Save Data</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Reset Check Data Overlay */}
      {isResetFundingModalOpen && apvToReset && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border-t-4 border-red-500">
            <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h3 className="font-semibold text-red-800 flex items-center text-sm md:text-base"><AlertTriangle size={18} className="mr-2" /> Reset APV</h3>
              <button onClick={() => setIsResetFundingModalOpen(false)} className="text-red-400 hover:text-red-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-4 md:p-6 space-y-4 text-center">
              <p className="text-sm md:text-base text-gray-700 font-sans">Are you sure you want to remove funding and delete all check details for <strong className="whitespace-nowrap">{apvToReset.id}</strong>?</p>
              <p className="text-xs md:text-sm text-gray-500">This will revert the APV to an unfunded, unpaid state.</p>
            </div>
            <div className="px-4 md:px-6 py-4 bg-gray-50 flex flex-col-reverse xs:flex-row justify-end xs:space-x-3">
              <button onClick={() => setIsResetFundingModalOpen(false)} className="w-full xs:w-auto px-4 py-2 mt-2 xs:mt-0 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer">Cancel</button>
              <button onClick={executeResetFunding} className="w-full xs:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center cursor-pointer">Remove Data</button>
            </div>
          </div>
        </div>
      )}

      {/* Datalist for fast filter mappings */}
      <datalist id="unpaid-apvs">
        {apvs.filter(a => a.status === 'Unpaid').map(a => <option key={a.id} value={a.id} />)}
      </datalist>

      {/* New APV Registry Modal */}
      {isApvModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter">{editingApvId ? 'Edit APV Record' : 'Register New APV'}</h3>
              <button onClick={() => setIsApvModalOpen(false)} className="text-gray-400 cursor-pointer"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddApvSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] uppercase font-bold text-gray-500">APV Number</label><input required readOnly={!!editingApvId} value={newApv.id} onChange={e => setNewApv({...newApv, id: e.target.value})} className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${editingApvId ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'border-gray-200'}`} /></div>
                <div><label className="text-[10px] uppercase font-bold text-gray-500">PO Ref</label><input required value={newApv.poId} onChange={e => { const val = e.target.value; const matched = purchases.find(p => p.id === val); setNewApv({...newApv, poId: val, ...(matched ? {vendor: matched.vendor || '', businessUnit: matched.businessUnit || 'ETMC', category: matched.category || 'Freshman', amount: matched.amount || 0} : {})}); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500">Vendor</label>
                <input required value={newApv.vendor} onChange={e => setNewApv({...newApv, vendor: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] uppercase font-bold text-gray-500">Invoice Date</label><input required type="date" value={newApv.invoiceDate} onChange={e => setNewApv({...newApv, invoiceDate: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" /></div>
                <div><label className="text-[10px] uppercase font-bold text-gray-500">Due Date</label><input required type="date" value={newApv.dueDate} onChange={e => setNewApv({...newApv, dueDate: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] uppercase font-bold text-gray-500">Billed Amount (₱)</label><input required type="number" step="0.01" value={newApv.amount || ''} onChange={e => setNewApv({...newApv, amount: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500">Category</label>
                  <select value={newApv.category || 'Freshman'} onChange={e => setNewApv({...newApv, category: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white cursor-pointer">
                    <option value="Freshman">Freshman</option>
                    <option value="Trading">Trading</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsApvModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 cursor-pointer">Save APV</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Management Registry Modal */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter">{editingPoId ? 'Edit Purchase Order' : 'New Purchase Order'}</h3>
              <button onClick={() => setIsPoModalOpen(false)} className="text-gray-400 cursor-pointer"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddPoSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] uppercase font-bold text-gray-500">PO Number</label><input required readOnly={!!editingPoId} value={newPo.id} onChange={e => setNewPo({...newPo, id: e.target.value})} className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${editingPoId ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'border-gray-200'}`} /></div>
                <div><label className="text-[10px] uppercase font-bold text-gray-500">Vendor</label><input required value={newPo.vendor} onChange={e => setNewPo({...newPo, vendor: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] uppercase font-bold text-gray-500">PR Received Date</label><input required type="date" value={newPo.prReceivedDate} onChange={e => setNewPo({...newPo, prReceivedDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white" /></div>
                <div><label className="text-[10px] uppercase font-bold text-gray-500">PO Issue Date</label><input required type="date" value={newPo.date} onChange={e => setNewPo({...newPo, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] uppercase font-bold text-gray-500">{newPo.category === 'Site Rental' || newPo.category === 'Services' ? 'Target Completion' : 'Expected Delivery'}</label><input required type="date" value={newPo.expectedDelivery} onChange={e => setNewPo({...newPo, expectedDelivery: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white" /></div>
                <div><label className="text-[10px] uppercase font-bold text-gray-500">{newPo.category === 'Site Rental' || newPo.category === 'Services' ? 'Completion Date' : 'Actual Received Date'} <span className="text-gray-400 font-normal lowercase">(Optional)</span></label><input type="date" value={newPo.receivedDate || ''} onChange={e => setNewPo({...newPo, receivedDate: e.target.value || null})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[10px] uppercase font-bold text-gray-500">Gross Amt (₱)</label><input required type="number" step="0.01" value={newPo.grossAmount || ''} onChange={e => { const gross = Number(e.target.value); const discount = newPo.discountAmount || 0; const net = Math.max(0, gross - discount); setNewPo({...newPo, grossAmount: gross, amount: net}); }} className="w-full px-2.5 py-2 border rounded-lg text-sm border-gray-200 focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="text-[10px] uppercase font-bold text-emerald-600">Discount (₱)</label><input type="number" step="0.01" value={newPo.discountAmount || ''} onChange={e => { const discount = Number(e.target.value); const gross = newPo.grossAmount || 0; const net = Math.max(0, gross - discount); setNewPo({...newPo, discountAmount: discount, amount: net}); }} className="w-full px-2.5 py-2 border rounded-lg text-sm border-gray-200 focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="text-[10px] uppercase font-bold text-indigo-600">Net Amount (₱)</label><input disabled type="number" value={newPo.amount || ''} className="w-full px-2.5 py-2 border rounded-lg text-sm bg-indigo-50 text-indigo-800 font-bold border-indigo-200 cursor-not-allowed" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500">Category</label>
                  <select value={newPo.category || 'Freshman'} onChange={e => setNewPo({...newPo, category: e.target.value})} className="w-full px-2.5 py-2 border rounded-lg text-sm bg-white cursor-pointer">
                    <option value="Freshman">Freshman</option>
                    <option value="Trading">Trading</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500">Payment Terms</label>
                  <select value={newPo.paymentTerms || 'Terms'} onChange={e => setNewPo({...newPo, paymentTerms: e.target.value})} className="w-full px-2.5 py-2 border rounded-lg text-sm bg-white cursor-pointer">
                    <option value="Terms">Std Terms</option>
                    <option value="COD">COD</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] uppercase font-bold text-gray-500">PR Requestor</label><input required type="text" value={newPo.prRequestor || ''} onChange={e => setNewPo({...newPo, prRequestor: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="e.g., Juan Santos" /></div>
                <div><label className="text-[10px] uppercase font-bold text-gray-500">Purchasing Processor</label><input required type="text" value={newPo.processorName || ''} onChange={e => setNewPo({...newPo, processorName: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="e.g., Alex Reyes" /></div>
              </div>
              <div><label className="text-[10px] uppercase font-bold text-gray-500">Description</label><input required type="text" value={newPo.description || ''} onChange={e => setNewPo({...newPo, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Brief description of items" /></div>
              <div><label className="text-[10px] uppercase font-bold text-gray-500">Remarks / Delivery Notes <span className="text-gray-400 font-normal lowercase">(Optional)</span></label><textarea value={newPo.remarks || ''} onChange={e => setNewPo({...newPo, remarks: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white" rows={2} placeholder="Any concerns regarding delivery, quality, or vendor..."></textarea></div>
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="text-[10px] uppercase font-bold text-slate-700 block mb-2 flex items-center"><Paperclip size={12} className="mr-1"/> Attach PR/PO Document <span className="text-slate-400 font-normal lowercase ml-1">(JPEG/PNG only)</span></label>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <input type="file" accept="image/jpeg, image/png" onChange={handleFileUpload} className="text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                  {newPo.attachmentData && (
                    <div className="relative shrink-0 mt-2 sm:mt-0">
                      <img src={newPo.attachmentData} alt="Preview" className="h-10 w-10 object-cover rounded border border-slate-200 shadow-sm" />
                      <button type="button" onClick={() => setNewPo({...newPo, attachmentData: ''})} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600 cursor-pointer"><X size={12}/></button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsPoModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 cursor-pointer">Save PO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Item Intake / Receiving Modal */}
      {isReceiveModalOpen && selectedPo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in">
            <h3 className="font-bold text-lg mb-4 flex items-center"><CheckCircle className="mr-2 text-emerald-600" /> Receive PO: {selectedPo.id}</h3>
            <form onSubmit={handleReceivePoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Actual Received Date</label>
                <input required type="date" value={receiveDate} onChange={e => setReceiveDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg mt-1 focus:ring-2 focus:ring-emerald-500 outline-none bg-white cursor-pointer" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsReceiveModalOpen(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors cursor-pointer">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear Database Modal overlay */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border-t-4 border-red-500">
            <h3 className="font-bold text-lg mb-2 text-red-700 flex items-center"><AlertTriangle className="mr-2" /> Clear All Data</h3>
            <p className="text-sm text-gray-600 mb-4">Are you absolutely sure you want to wipe all Purchase Orders and APVs? This action is irreversible.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsClearModalOpen(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold cursor-pointer">Cancel</button>
              <button type="button" onClick={handleClearAllData} disabled={isClearing} className="flex-1 py-2 bg-red-600 hover:bg-red-700 transition-colors text-white rounded-lg font-bold disabled:opacity-50 flex items-center justify-center cursor-pointer">
                {isClearing ? <Loader2 className="animate-spin mr-2" size={16}/> : <Trash2 className="mr-2" size={16}/>}
                {isClearing ? 'Clearing...' : 'Wipe Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Document Fullscreen Previews */}
      {viewingImage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in" onClick={() => setViewingImage(null)}>
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <button onClick={() => setViewingImage(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors cursor-pointer"><X size={32} /></button>
            <img src={viewingImage} alt="Attachment Document" className="max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white" onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}

    </div>
  );
}
