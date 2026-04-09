import React, { useState, useEffect, useMemo } from 'react';
import {
    Calculator, Receipt, TrendingUp, TrendingDown,
    ArrowUpCircle, ArrowDownCircle, Plus, Search,
    Calendar, User, FileText, Landmark, Wallet,
    CheckCircle, Clock, AlertCircle, ChevronRight, ChevronDown,
    Settings, Edit2, Trash, X, Hash, Percent, Globe, Package, Zap, Box, Check
} from 'lucide-react';
import { API_URL, fetchWithAuth } from '../App';

export default function BackOfficeAccounting() {
    const [activeTab, setActiveTab] = useState('overview');
    const [accounts, setAccounts] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [payables, setPayables] = useState([]);
    const [journal, setJournal] = useState([]);
    const [reports, setReports] = useState({
        pl: [],
        balanceSheet: [],
        cashFlow: [],
        expensesSummary: []
    });
    const [dailySummary, setDailySummary] = useState(null);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [activeReportTab, setActiveReportTab] = useState('pl');
    const [loading, setLoading] = useState(false);
    const [expandedAccounts, setExpandedAccounts] = useState([]);
    const [targetAccount, setTargetAccount] = useState(null);

    // Form state - Expenses
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        date: new Date().toISOString().split('T')[0],
        vendor_id: '',
        category: 'Operational',
        description: '',
        amount: '', // Subtotal
        tax_amount: '0',
        reference_no: '',
        debit_account_id: '',
        credit_account_id: '',
        payment_status: 'paid',
        payment_method: 'cash'
    });

    // Form state - Account CRUD
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [accountForm, setAccountForm] = useState({
        code: '',
        name: '',
        type: 'Asset',
        category: '',
        parent_id: '',
        is_header: false
    });

    const categories = ['Operational', 'Administrative', 'Inventory', 'Labor', 'Utilities', 'Taxes', 'Others'];
    const accountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

    // Opening Balance state
    const [showOBModal, setShowOBModal] = useState(false);
    const [obForm, setObForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });

    // Transaction Details state
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    // Migration Assistant state
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [migrationEntries, setMigrationEntries] = useState({}); // { accountId: amount }
    const [migrationDate, setMigrationDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [accRes, venRes, payRes, jRes] = await Promise.all([
                fetchWithAuth(`${API_URL}/accounting/accounts`),
                fetchWithAuth(`${API_URL}/accounting/vendors`),
                fetchWithAuth(`${API_URL}/accounting/payables`),
                fetchWithAuth(`${API_URL}/accounting/journal`)
            ]);

            const accountsData = await accRes.json();
            const vendorsData = await venRes.json();
            const payablesData = await payRes.json();
            const journalData = await jRes.json();

            if (accountsData.success) {
                setAccounts(accountsData.accounts);
                if (expandedAccounts.length === 0) {
                    setExpandedAccounts(accountsData.accounts.filter(a => a.is_header).map(a => a.id));
                }
            }
            if (vendorsData.success) setVendors(vendorsData.vendors);
            if (payablesData.success) setPayables(payablesData.payables);
            if (journalData.success) setJournal(journalData.journal);
        } catch (error) {
            console.error('Accounting fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { start, end } = dateRange;
            console.log('Fetching financial reports for:', { start, end });
            const [plRes, bsRes, cfRes, exRes, dsRes] = await Promise.all([
                fetchWithAuth(`${API_URL}/accounting/reports/pl?start=${start}&end=${end}`),
                fetchWithAuth(`${API_URL}/accounting/reports/balance-sheet?date=${end}`),
                fetchWithAuth(`${API_URL}/accounting/reports/cash-flow?start=${start}&end=${end}`),
                fetchWithAuth(`${API_URL}/accounting/reports/expenses-summary?start=${start}&end=${end}`),
                fetchWithAuth(`${API_URL}/accounting/reports/daily-summary?date=${end}`)
            ]);

            const plData = await plRes.json();
            const bsData = await bsRes.json();
            const cfData = await cfRes.json();
            const exData = await exRes.json();
            const dsData = await dsRes.json();

            setReports({
                pl: plData.data || [],
                balanceSheet: bsData.data || [],
                cashFlow: cfData.data || [],
                expensesSummary: exData.data || []
            });
            setDailySummary(dsData.data || null);
        } catch (error) {
            console.error('Report fetch error:', error);
            alert('Protocol Error: Failed to synchronize financial metrics. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const postDailySummary = async () => {
        if (!dailySummary || (parseFloat(dailySummary.total_sales) === 0 && parseFloat(dailySummary.total_cogs) === 0)) {
            alert('No unposted entries for this date.');
            return;
        }

        if (!confirm(`Authorize Ledger Injection for ${dailySummary.date}?\nSales: ₱${parseFloat(dailySummary.total_sales).toLocaleString()}\nCOGS: ₱${parseFloat(dailySummary.total_cogs).toLocaleString()}`)) {
            return;
        }

        setLoading(true);
        try {
            console.log('Posting daily summary to ledger...');
            const res = await fetchWithAuth(`${API_URL}/accounting/reports/post-daily`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dailySummary.date })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert('Daily summary successfully committed to Master Journal.');
                await Promise.all([fetchReports(), fetchData()]);
            } else {
                alert('Ledger Rejection: ' + (data.error || 'The server refused to post the transaction.'));
            }
        } catch (error) {
            console.error('Final Injection Critical Error:', error);
            alert('Critical System Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };
    
    const openTransactionDetails = (journalId) => {
        const fullTransaction = journal.filter(j => j.journal_id === journalId);
        if (fullTransaction.length > 0) {
            setSelectedTransaction({
                id: journalId,
                date: fullTransaction[0].date,
                description: fullTransaction[0].description,
                reference_no: fullTransaction[0].reference_no,
                source_module: fullTransaction[0].source_module,
                entries: fullTransaction
            });
            setShowTransactionModal(true);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (activeTab === 'financials' || activeTab === 'dp') {
            fetchReports();
        }
    }, [activeTab, dateRange]);

    const toggleAccount = (id) => {
        setExpandedAccounts(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const accountTree = useMemo(() => {
        const buildTree = (parentId = null) => {
            return accounts
                .filter(a => a.parent_id === parentId)
                .map(a => {
                    const children = buildTree(a.id);
                    // If it's a header, sum up the children's balances, debits, and credits
                    let total_debit = parseFloat(a.total_debit || 0);
                    let total_credit = parseFloat(a.total_credit || 0);
                    let balance = parseFloat(a.balance || 0);

                    if (a.is_header && children.length > 0) {
                        total_debit = children.reduce((sum, child) => sum + parseFloat(child.total_debit || 0), 0);
                        total_credit = children.reduce((sum, child) => sum + parseFloat(child.total_credit || 0), 0);
                        // For balance, it's more complex because of normal balance types, 
                        // but summing the individual balances is usually sufficient if they are pre-calculated correctly
                        balance = children.reduce((sum, child) => sum + parseFloat(child.balance || 0), 0);
                    }

                    return {
                        ...a,
                        total_debit,
                        total_credit,
                        balance,
                        children
                    };
                })
                .sort((a, b) => a.code.localeCompare(b.code));
        };
        const tree = buildTree(null);
        if (tree.length === 0 && accounts.length > 0) {
            const types = [...new Set(accounts.map(a => a.type))];
            return types.map(t => {
                const typeAccounts = accounts.filter(a => a.type === t && !a.parent_id);
                const children = typeAccounts.map(a => ({
                    ...a,
                    total_debit: parseFloat(a.total_debit || 0),
                    total_credit: parseFloat(a.total_credit || 0),
                    balance: parseFloat(a.balance || 0)
                }));

                return {
                    id: `type-${t}`,
                    name: t.toUpperCase(),
                    is_header: true,
                    type: t,
                    code: t.charAt(0),
                    total_debit: children.reduce((sum, c) => sum + c.total_debit, 0),
                    total_credit: children.reduce((sum, c) => sum + c.total_credit, 0),
                    balance: children.reduce((sum, c) => sum + c.balance, 0),
                    children
                };
            });
        }
        return tree;
    }, [accounts]);

    const totalExpenseAmount = useMemo(() => {
        const sub = parseFloat(expenseForm.amount || 0);
        const tax = parseFloat(expenseForm.tax_amount || 0);
        return (sub + tax).toFixed(2);
    }, [expenseForm.amount, expenseForm.tax_amount]);

    const handleRecordExpense = async (e) => {
        e.preventDefault();
        const amount = parseFloat(expenseForm.amount);
        const tax = parseFloat(expenseForm.tax_amount || 0);
        const total = amount + tax;

        try {
            const res = await fetchWithAuth(`${API_URL}/accounting/expenses`, {
                method: 'POST',
                body: JSON.stringify({
                    ...expenseForm,
                    amount: amount,
                    tax_amount: tax,
                    total_amount: total,
                    date_incurred: expenseForm.date
                })
            });

            const result = await res.json();
            if (res.ok && result.success) {
                alert('Expense successfully recorded in ledger.');
                setShowExpenseModal(false);
                fetchData();
                setExpenseForm({
                    date: new Date().toISOString().split('T')[0],
                    vendor_id: '',
                    category: 'Operational',
                    amount: '',
                    tax_amount: '0',
                    payment_status: 'paid',
                    payment_method: 'Cash',
                    description: '',
                    reference_no: '',
                    debit_account_id: '',
                    credit_account_id: ''
                });
            } else {
                alert(`Protocol Rejection: ${result.error || 'Unknown Ledger Error'}`);
            }
        } catch (error) {
            console.error('Critical Failure:', error);
            alert(`Network or Server Failure: ${error.message}`);
        }
    };

    const handleAccountSubmit = async (e) => {
        e.preventDefault();
        const method = editingAccount ? 'PUT' : 'POST';
        const url = editingAccount
            ? `${API_URL}/accounting/accounts/${editingAccount.id}`
            : `${API_URL}/accounting/accounts`;

        try {
            const res = await fetchWithAuth(url, {
                method,
                body: JSON.stringify(accountForm)
            });
            const result = await res.json();
            if (result.success) {
                alert(`Account ${editingAccount ? 'updated' : 'created'} successfully!`);
                setShowAccountModal(false);
                setEditingAccount(null);
                fetchData();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Failed to save account');
        }
    };

    const handleSetOpeningBalance = async (e) => {
        e.preventDefault();
        try {
            const res = await fetchWithAuth(`${API_URL}/accounting/accounts/${targetAccount.id}/opening-balance`, {
                method: 'POST',
                body: JSON.stringify(obForm)
            });
            const result = await res.json();
            if (result.success) {
                alert('Opening balance recorded successfully!');
                setShowOBModal(false);
                fetchData();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Failed to set opening balance');
        }
    };

    const handleBatchMigration = async (e) => {
        e.preventDefault();
        const entries = Object.entries(migrationEntries)
            .filter(([_, amount]) => parseFloat(amount || 0) !== 0)
            .map(([id, amount]) => ({ account_id: id, amount: parseFloat(amount) }));

        if (entries.length === 0) return alert('All entry values are zero');

        try {
            const res = await fetchWithAuth(`${API_URL}/accounting/accounts/batch-opening-balance`, {
                method: 'POST',
                body: JSON.stringify({ entries, date: migrationDate })
            });
            const result = await res.json();
            if (result.success) {
                alert('Migration successful!');
                setShowMigrationModal(false);
                setMigrationEntries({});
                fetchData();
            } else {
                alert('Migration failed: ' + result.error);
            }
        } catch (error) {
            alert('Failed to process migration');
        }
    };

    const openEditAccount = (acc) => {
        setEditingAccount(acc);
        setAccountForm({
            code: acc.code,
            name: acc.name,
            type: acc.type,
            category: acc.category || '',
            parent_id: acc.parent_id || '',
            is_header: acc.is_header
        });
        setShowAccountModal(true);
    };

    const handleDeleteAccount = async (id) => {
        if (!window.confirm('Are you sure you want to delete this account?')) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/accounting/accounts/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                alert('Account deleted.');
                fetchData();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Delete failed');
        }
    };

    const AccountRow = ({ account, depth = 0 }) => {
        const hasChildren = account.children && account.children.length > 0;
        const isExpanded = expandedAccounts.includes(account.id);

        return (
            <>
                <tr className={`${account.is_header ? 'bg-gray-50/50 font-bold' : 'hover:bg-gray-50'} transition-all text-sm group border-b border-gray-100`}>
                    <td className="px-8 py-4">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
                            {hasChildren ? (
                                <button onClick={() => toggleAccount(account.id)} className="text-gray-400 hover:text-cyan-600">
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                            ) : (
                                <div className="w-3.5" />
                            )}
                            <span className="font-mono text-cyan-500 font-black">{account.code}</span>
                        </div>
                    </td>
                    <td className="px-8 py-4">
                        <span className={account.is_header ? 'text-gray-900 uppercase font-black tracking-tight' : 'text-gray-700 font-bold'}>
                            {account.name}
                        </span>
                    </td>
                    <td className="px-8 py-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${account.type === 'Asset' ? 'bg-green-50 text-green-600' :
                                account.type === 'Expense' ? 'bg-red-50 text-red-600' :
                                    account.type === 'Revenue' ? 'bg-blue-50 text-blue-600' :
                                        'bg-gray-50 text-gray-600'
                            }`}>
                            {account.type}
                        </span>
                    </td>
                    <td className="px-8 py-4 text-green-600 font-black text-xs text-right">
                        {parseFloat(account.total_debit || 0) > 0 ? `₱${parseFloat(account.total_debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-8 py-4 text-red-600 font-black text-xs text-right">
                        {parseFloat(account.total_credit || 0) > 0 ? `₱${parseFloat(account.total_credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-8 py-4 text-gray-900 font-black text-xs text-right">
                        ₱{parseFloat(account.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-4 text-gray-400 text-[10px] font-black uppercase tracking-widest flex justify-between items-center whitespace-nowrap">
                        <span>{account.category}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!account.is_header && (
                                <button
                                    onClick={() => { setTargetAccount(account); setShowOBModal(true); }}
                                    title="Set Opening Balance"
                                    className="p-1.5 hover:bg-cyan-50 rounded-lg text-cyan-600 shadow-sm border border-gray-100"
                                >
                                    <Landmark size={12} />
                                </button>
                            )}
                            <button onClick={() => openEditAccount(account)} className="p-1.5 hover:bg-white rounded-lg text-cyan-600 shadow-sm border border-gray-100"><Edit2 size={12} /></button>
                            <button onClick={() => handleDeleteAccount(account.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 shadow-sm border border-gray-100"><Trash size={12} /></button>
                        </div>
                    </td>
                </tr>
                {hasChildren && isExpanded && (
                    account.children.map(child => (
                        <AccountRow key={child.id} account={child} depth={depth + 1} />
                    ))
                )}
            </>
        );
    };

    const getSourceIcon = (module) => {
        switch (module) {
            case 'pos': return <Zap size={14} className="text-amber-500" />;
            case 'inventory': return <Package size={14} className="text-blue-500" />;
            case 'expenses': return <Receipt size={14} className="text-red-500" />;
            default: return <Globe size={14} className="text-gray-400" />;
        }
    };

    return (
        <div className="bg-[#F8FAFC] min-h-screen pt-24 pb-12 font-dashboard">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-2">Accounting Protocol</h1>
                        <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em]">Full Double Entry Automata & Audit System</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowMigrationModal(true)}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-cyan-500/30 flex items-center gap-3 transition-all active:scale-95"
                        >
                            <TrendingUp size={16} />
                            Migration Assistant
                        </button>
                        <button
                            onClick={() => {
                                setEditingAccount(null);
                                setAccountForm({ code: '', name: '', type: 'Asset', category: '', parent_id: '', is_header: false });
                                setShowAccountModal(true);
                            }}
                            className="bg-white hover:bg-gray-50 text-gray-900 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] border border-gray-200 shadow-xl shadow-gray-200/20 flex items-center gap-3 transition-all active:scale-95"
                        >
                            <Settings size={16} className="text-gray-400" />
                            Configuration
                        </button>
                        <button
                            onClick={() => setShowExpenseModal(true)}
                            className="bg-[#0A0F0D] hover:bg-cyan-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-cyan-900/20 flex items-center gap-3 transition-all active:scale-95 group"
                        >
                            <Plus size={18} className="text-cyan-400 group-hover:rotate-90 transition-transform" />
                            Record Transaction
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-3 p-2 bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-xl shadow-gray-200/30 border border-white mb-10 overflow-x-auto scroller-hide sticky top-24 z-40">
                    {[
                        { id: 'overview', label: 'Intelligence', icon: <TrendingUp size={18} /> },
                        { id: 'financials', label: 'Financials', icon: <Calculator size={18} /> },
                        { id: 'journal', label: 'Master Journal', icon: <FileText size={18} /> },
                        { id: 'payables', label: 'Liability Log', icon: <Clock size={18} /> },
                        { id: 'coa', label: 'COA Hierarchy', icon: <Landmark size={18} /> },
                        { id: 'dp', label: 'Daily Post', icon: <Zap size={18} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-8 py-4 rounded-[2rem] font-black text-[9px] tracking-[0.25em] uppercase transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-[#0A0F0D] text-cyan-400 shadow-2xl shadow-cyan-900/30'
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                                }`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === tab.id ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]' : 'bg-gray-200'}`}></div>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 gap-10">
                    {activeTab === 'overview' && (
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-gray-200/20 border border-gray-50 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/5 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000"></div>
                                    <div className="relative z-10">
                                        <div className="p-5 bg-green-50 text-green-600 rounded-3xl w-fit mb-8">
                                            <TrendingUp size={32} />
                                        </div>
                                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Total Yield</p>
                                        <h2 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
                                            ₱{reports.pl.filter(r => r.type === 'Revenue').reduce((sum, r) => sum + parseFloat(r.balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </h2>
                                    </div>
                                </div>
                                <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-gray-200/20 border border-gray-50 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000"></div>
                                    <div className="relative z-10">
                                        <div className="p-5 bg-red-50 text-red-600 rounded-3xl w-fit mb-8">
                                            <TrendingDown size={32} />
                                        </div>
                                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Operational Burn</p>
                                        <h2 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
                                            ₱{reports.pl.filter(r => r.type === 'Expense').reduce((sum, r) => sum + Math.abs(parseFloat(r.balance || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </h2>
                                    </div>
                                </div>
                                <div className="bg-[#0A0F0D] p-10 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(8,145,178,0.3)] text-white relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-600/20 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000"></div>
                                    <div className="relative z-10">
                                        <div className="p-5 bg-cyan-600/20 text-cyan-400 rounded-3xl w-fit mb-8 backdrop-blur-xl border border-white/5">
                                            <Wallet size={32} />
                                        </div>
                                        <p className="text-cyan-400/60 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Net Capital Flow</p>
                                        <h2 className="text-5xl font-black tracking-tighter text-white leading-none">
                                            ₱{(reports.pl.filter(r => r.type === 'Revenue').reduce((sum, r) => sum + parseFloat(r.balance || 0), 0) -
                                                reports.pl.filter(r => r.type === 'Expense').reduce((sum, r) => sum + Math.abs(parseFloat(r.balance || 0)), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </h2>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-gray-200/20 border border-gray-100">
                                    <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em] mb-8">Burn Classification</h3>
                                    <div className="space-y-6">
                                        {reports.expensesSummary.slice(0, 5).map(ex => (
                                            <div key={ex.category} className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <span>{ex.category}</span>
                                                    <span className="text-gray-900">₱{parseFloat(ex.total).toLocaleString()}</span>
                                                </div>
                                                <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-cyan-500 rounded-full"
                                                        style={{ width: `${(parseFloat(ex.total) / reports.expensesSummary.reduce((s, e) => s + parseFloat(e.total), 0)) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-[#0A0F0D] p-10 rounded-[3rem] shadow-2xl shadow-cyan-900/20 text-white">
                                    <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-8">Asset Liquidity Matrix</h3>
                                    <div className="space-y-4">
                                        {reports.balanceSheet.filter(a => a.type === 'Asset').filter(a => parseFloat(a.balance) !== 0).slice(0, 5).map(asset => (
                                            <div key={asset.code} className="p-5 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-white/10 transition-all cursor-default">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]"></div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-cyan-400/60 uppercase tracking-widest leading-none mb-1">{asset.code}</p>
                                                        <p className="text-xs font-black uppercase tracking-tight">{asset.name}</p>
                                                    </div>
                                                </div>
                                                <p className="text-lg font-black tracking-tighter">₱{parseFloat(asset.balance).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financials' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="mb-10 flex flex-wrap gap-4 items-center justify-between">
                                <div className="flex gap-2 p-1 bg-white rounded-2xl border border-gray-100">
                                    {[
                                        { id: 'pl', label: 'Profit & Loss' },
                                        { id: 'bs', label: 'Balance Sheet' },
                                        { id: 'cf', label: 'Cash Flow' }
                                    ].map(sub => (
                                        <button
                                            key={sub.id}
                                            onClick={() => setActiveReportTab(sub.id)}
                                            className={`px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${activeReportTab === sub.id ? 'bg-[#0A0F0D] text-white' : 'text-gray-400 hover:text-gray-900'
                                                }`}
                                        >
                                            {sub.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-3 items-center">
                                    <div className="flex gap-2 p-1 bg-white rounded-2xl border border-gray-100">
                                        <input
                                            type="date" value={dateRange.start}
                                            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                            className="px-4 py-2 bg-transparent text-[10px] font-black uppercase text-gray-500"
                                        />
                                        <span className="flex items-center text-gray-300">|</span>
                                        <input
                                            type="date" value={dateRange.end}
                                            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                            className="px-4 py-2 bg-transparent text-[10px] font-black uppercase text-gray-500"
                                        />
                                    </div>
                                    <button onClick={fetchReports} className="p-3 bg-white text-gray-900 rounded-2xl border border-gray-100 hover:bg-gray-50"><Zap size={18} /></button>
                                </div>
                            </div>

                            {activeReportTab === 'pl' && (
                                <div className="bg-white rounded-[3.5rem] shadow-2xl border border-gray-50 overflow-hidden">
                                    <div className="p-10 border-b border-gray-50">
                                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Income Statement Protocol</h2>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Operational Yield vs Resource Burn</p>
                                    </div>
                                    <div className="p-10 space-y-12">
                                        {/* Revenue */}
                                        <section className="space-y-6">
                                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                                <TrendingUp size={16} /> REVENUE STREAM
                                            </h3>
                                            <div className="space-y-4">
                                                {reports.pl.filter(r => r.type === 'Revenue').map(row => (
                                                    <div key={row.code} className="flex justify-between items-center p-6 bg-blue-50/30 rounded-3xl border border-blue-50">
                                                        <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{row.name}</span>
                                                        <span className="text-lg font-black text-blue-600">₱{parseFloat(row.balance || 0).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between items-center p-8 bg-[#0A0F0D] rounded-[2rem] text-white">
                                                    <span className="text-xs font-black uppercase tracking-widest">Gross Yield</span>
                                                    <span className="text-3xl font-black tracking-tighter">₱{reports.pl.filter(r => r.type === 'Revenue').reduce((s, r) => s + parseFloat(r.balance || 0), 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Expense */}
                                        <section className="space-y-6">
                                            <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                                <TrendingDown size={16} /> RESOURCE BURN
                                            </h3>
                                            <div className="space-y-3">
                                                {reports.pl.filter(r => r.type === 'Expense').map(row => (
                                                    <div key={row.code} className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
                                                        <span className="text-xs font-black text-gray-600 uppercase tracking-tight">{row.name}</span>
                                                        <span className="text-sm font-bold text-gray-900">₱{Math.abs(parseFloat(row.balance || 0)).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between items-center p-6 bg-red-50 rounded-2xl text-red-600 mt-6">
                                                    <span className="text-xs font-black uppercase tracking-widest">Total Burn</span>
                                                    <span className="text-2xl font-black tracking-tighter">-₱{reports.pl.filter(r => r.type === 'Expense').reduce((s, r) => s + Math.abs(parseFloat(r.balance || 0)), 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Net */}
                                        {(() => {
                                            const totalRevenue = reports.pl.filter(r => r.type === 'Revenue').reduce((sum, r) => sum + parseFloat(r.balance || 0), 0);
                                            const totalExpense = reports.pl.filter(r => r.type === 'Expense').reduce((sum, r) => sum + Math.abs(parseFloat(r.balance || 0)), 0);
                                            const netYield = totalRevenue - totalExpense;
                                            const isPositive = netYield >= 0;

                                            return (
                                                <div className={`p-10 rounded-[2.5rem] flex justify-between items-center shadow-2xl transition-all ${isPositive
                                                        ? 'bg-green-500 text-white shadow-green-500/30'
                                                        : 'bg-red-500 text-white shadow-red-500/30'
                                                    }`}>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 opacity-80">Net Protocol Settlement</p>
                                                        <h4 className="text-4xl font-black tracking-tighter">₱{netYield.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                                                    </div>
                                                    {isPositive ? <CheckCircle size={64} className="opacity-20" /> : <AlertCircle size={64} className="opacity-20" />}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {activeReportTab === 'bs' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="bg-white rounded-[3.5rem] shadow-2xl border border-gray-50 p-10 space-y-10">
                                        <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em] flex items-center gap-3">
                                            <Box size={16} /> ASSETS (QUANTUM POSSESSION)
                                        </h3>
                                        <div className="space-y-4">
                                            {reports.balanceSheet.filter(r => r.type === 'Asset').map(row => (
                                                <div key={row.code} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl group hover:bg-cyan-50 transition-all">
                                                    <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{row.name}</span>
                                                    <span className="text-base font-black text-cyan-600">₱{parseFloat(row.balance || 0).toLocaleString()}</span>
                                                </div>
                                            ))}
                                            <div className="p-8 bg-[#0A0F0D] rounded-3xl text-white">
                                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">Total Corporate Assets</p>
                                                <h4 className="text-3xl font-black tracking-tighter">₱{reports.balanceSheet.filter(r => r.type === 'Asset').reduce((s, r) => s + parseFloat(r.balance || 0), 0).toLocaleString()}</h4>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-10">
                                        <div className="bg-white rounded-[3.5rem] shadow-2xl border border-gray-100 p-10">
                                            <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] flex items-center gap-3 mb-8">
                                                <TrendingDown size={16} /> LIABILITIES & EQUITY
                                            </h3>
                                            <div className="space-y-4">
                                                {reports.balanceSheet.filter(r => ['Liability', 'Equity'].includes(r.type)).map(row => (
                                                    <div key={row.code} className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
                                                        <span className="text-xs font-black text-gray-600 uppercase tracking-tight">{row.name}</span>
                                                        <span className="text-sm font-bold text-gray-900">₱{Math.abs(parseFloat(row.balance)).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                <div className="p-8 bg-gray-900 rounded-3xl text-white mt-8">
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">Total Source of Capital</p>
                                                    <h4 className="text-3xl font-black tracking-tighter">₱{reports.balanceSheet.filter(r => ['Liability', 'Equity'].includes(r.type)).reduce((s, r) => s + Math.abs(parseFloat(r.balance || 0)), 0).toLocaleString()}</h4>
                                                </div>
                                            </div>
                                        </div>

                                        {(() => {
                                            const netProfit = (reports.pl.filter(r => r.type === 'Revenue').reduce((s, r) => s + parseFloat(r.balance || 0), 0) -
                                                reports.pl.filter(r => r.type === 'Expense').reduce((s, r) => s + Math.abs(parseFloat(r.balance || 0)), 0));
                                            const totalA = reports.balanceSheet.filter(r => r.type === 'Asset').reduce((s, r) => s + parseFloat(r.balance || 0), 0);
                                            const totalLE = reports.balanceSheet.filter(r => ['Liability', 'Equity'].includes(r.type)).reduce((s, r) => s + Math.abs(parseFloat(r.balance || 0)), 0);
                                            const totalBalancedLE = totalLE + netProfit;
                                            const variance = totalA - totalBalancedLE;
                                            const isBalanced = Math.abs(variance) < 0.01;

                                            return (
                                                <div className="space-y-6">
                                                    <div className="p-8 bg-cyan-600 rounded-3xl text-white shadow-xl shadow-cyan-600/20">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Source of Capital (Balanced)</span>
                                                            <span className="text-[9px] font-black bg-white/10 px-2 py-1 rounded">L + E + PROFIT</span>
                                                        </div>
                                                        <h4 className="text-4xl font-black tracking-tighter">₱{totalBalancedLE.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                                                    </div>

                                                    <div className={`p-8 rounded-3xl flex items-center justify-between border transition-all duration-500 ${isBalanced ? 'bg-[#0A0F0D] border-gray-100 text-white' : 'bg-red-50 border-red-100 animate-pulse'
                                                        }`}>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isBalanced ? 'bg-cyan-600 text-white' : 'bg-red-600 text-white'
                                                                }`}>
                                                                {isBalanced ? '!' : '?'}
                                                            </div>
                                                            <div>
                                                                <p className={`text-[9px] font-black uppercase tracking-widest ${isBalanced ? 'text-cyan-400' : 'text-red-700'}`}>
                                                                    Ledger Equilibrium Status
                                                                </p>
                                                                <p className={`text-xs font-black uppercase ${isBalanced ? 'text-white' : 'text-red-900'}`}>
                                                                    {isBalanced ? 'Double-Entry Verified · Zero Variance' : `Variance Detected · ₱${variance.toLocaleString()}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {isBalanced ? <Check size={24} className="text-cyan-400" /> : <AlertCircle size={24} className="text-red-600" />}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {activeReportTab === 'cf' && (
                                <div className="bg-white rounded-[3.5rem] shadow-2xl border border-gray-50 overflow-hidden">
                                    <div className="p-10 border-b border-gray-50 bg-gray-50/20">
                                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Hydraulic Capital Log</h2>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Inflow vs Outflow Velocity Matrix</p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-[#FBFCFE] text-gray-400 uppercase tracking-[0.3em] text-[10px] font-black border-b border-gray-100">
                                                <tr>
                                                    <th className="px-10 py-8">Timestamp</th>
                                                    <th className="px-10 py-8">Account Origin</th>
                                                    <th className="px-10 py-8">Narrative</th>
                                                    <th className="px-10 py-8 text-green-500">Inflow (+)</th>
                                                    <th className="px-10 py-8 text-red-500">Outflow (-)</th>
                                                    <th className="px-10 py-8 text-right">Net Momentum</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {reports.cashFlow.map((log, idx) => {
                                                    const netChange = parseFloat(log.net_change);
                                                    return (
                                                        <tr key={idx} className="hover:bg-gray-50/50 transition-all font-data-table">
                                                            <td className="px-10 py-6 text-xs text-gray-400 font-bold">{new Date(log.date).toLocaleDateString()}</td>
                                                            <td className="px-10 py-6">
                                                                <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-600">{log.account_name}</span>
                                                            </td>
                                                            <td className="px-10 py-6 text-[11px] font-black text-gray-900 uppercase tracking-tight">{log.description}</td>
                                                            <td className="px-10 py-6 text-green-500 font-bold">₱{parseFloat(log.inflow).toLocaleString()}</td>
                                                            <td className="px-10 py-6 text-red-500 font-bold">₱{parseFloat(log.outflow).toLocaleString()}</td>
                                                            <td className={`px-10 py-6 text-right font-black ${netChange >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                                                ₱{netChange.toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr className="bg-[#0A0F0D] text-white">
                                                    <td colSpan="3" className="px-10 py-10 text-xs font-black uppercase tracking-widest">Aggregate Velocity Summary</td>
                                                    <td className="px-10 py-10 font-black text-green-400">₱{reports.cashFlow.reduce((s, c) => s + parseFloat(c.inflow), 0).toLocaleString()}</td>
                                                    <td className="px-10 py-10 font-black text-red-400">₱{reports.cashFlow.reduce((s, c) => s + parseFloat(c.outflow), 0).toLocaleString()}</td>
                                                    <td className="px-10 py-10 text-right font-black text-2xl tracking-tighter">
                                                        ₱{reports.cashFlow.reduce((s, c) => s + parseFloat(c.net_change), 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'dp' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="mb-10 flex flex-wrap gap-4 items-center justify-between">
                                <div className="px-6 py-3 bg-white rounded-2xl border border-gray-100 text-[#0A0F0D] font-black text-[9px] uppercase tracking-[0.3em]">
                                    Ledger Injection Protocol
                                </div>
                                <div className="flex gap-3 items-center">
                                    <div className="flex gap-2 p-1 bg-white rounded-2xl border border-gray-100">
                                        <input
                                            type="date" value={dateRange.start}
                                            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                            className="px-4 py-2 bg-transparent text-[10px] font-black uppercase text-gray-500"
                                        />
                                        <span className="flex items-center text-gray-300">|</span>
                                        <input
                                            type="date" value={dateRange.end}
                                            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                            className="px-4 py-2 bg-transparent text-[10px] font-black uppercase text-gray-500"
                                        />
                                    </div>
                                    <button onClick={fetchReports} className="p-3 bg-white text-gray-900 rounded-2xl border border-gray-100 hover:bg-gray-50"><Zap size={18} /></button>
                                </div>
                            </div>

                            <div className="space-y-10">
                                <div className="bg-white rounded-[3.5rem] shadow-2xl border border-gray-50 p-10">
                                    <div className="flex justify-between items-center mb-10">
                                        <div>
                                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Daily Closing Protocol &middot; {dailySummary?.date || dateRange.end}</h2>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Audit and Injection to Master Ledger</p>
                                        </div>
                                        <div className="px-5 py-2 bg-yellow-50 text-yellow-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-yellow-100">
                                            Intervention Required
                                        </div>
                                    </div>

                                    {dailySummary ? (
                                        <div className="space-y-10">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Pending Sales</p>
                                                    <h4 className="text-4xl font-black tracking-tighter text-gray-900">₱{parseFloat(dailySummary.total_sales).toLocaleString()}</h4>
                                                    <p className="text-[10px] text-gray-400 mt-2">{dailySummary.order_count} Valid Orders</p>
                                                </div>
                                                <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Calculated COGS</p>
                                                    <h4 className="text-4xl font-black tracking-tighter text-gray-900">₱{parseFloat(dailySummary.total_cogs).toLocaleString()}</h4>
                                                    <p className="text-[10px] text-gray-400 mt-2">Aggregate Resource Burn</p>
                                                </div>
                                                <div className="p-8 bg-cyan-900 rounded-3xl text-white shadow-xl shadow-cyan-900/20">
                                                    <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-4">Net Yield</p>
                                                    <h4 className="text-4xl font-black tracking-tighter">₱{(parseFloat(dailySummary.total_sales) - parseFloat(dailySummary.total_cogs)).toLocaleString()}</h4>
                                                    <p className="text-[10px] text-cyan-400/60 mt-2">Ready for Posting</p>
                                                </div>
                                            </div>

                                            <div className="p-10 bg-[#0A0F0D] rounded-[3rem] text-white flex flex-wrap gap-8 items-center justify-between">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center">
                                                        <Zap size={32} className="text-cyan-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-400">Post summary for {dailySummary.date}?</p>
                                                        <p className="text-[10px] text-gray-500 max-w-sm mt-1 uppercase tracking-tight font-black">
                                                            This will create two manual journal entries (Sales & COGS) and lock the day's records.
                                                        </p>
                                                    </div>
                                                </div>
                                                {parseFloat(dailySummary.total_sales) > 0 || parseFloat(dailySummary.total_cogs) > 0 ? (
                                                    <button
                                                        onClick={postDailySummary}
                                                        className="px-10 py-5 bg-cyan-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] hover:bg-cyan-400 transition-all shadow-xl shadow-cyan-500/30"
                                                    >
                                                        Authorize Final Injection
                                                    </button>
                                                ) : (
                                                    <div className="px-10 py-5 border border-white/10 text-white/30 rounded-[2rem] font-black uppercase tracking-widest text-[11px]">
                                                        All Records Synced
                                                    </div>
                                                )}
                                            </div>

                                            {dailySummary.orders && dailySummary.orders.length > 0 && (
                                                <div className="space-y-6">
                                                    <div className="flex justify-between items-center px-4">
                                                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Pending Audit Trail</h3>
                                                        <span className="px-3 py-1 bg-gray-100 rounded-lg text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                                            {dailySummary.orders.length} ITEMS DETECTED
                                                        </span>
                                                    </div>
                                                    <div className="bg-gray-50/50 rounded-[2.5rem] border border-gray-100 overflow-hidden">
                                                        <div className="max-h-[400px] overflow-y-auto">
                                                            <table className="w-full text-left">
                                                                <thead className="bg-white/50 backdrop-blur-sm sticky top-0 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                                                    <tr>
                                                                        <th className="px-10 py-6">Order ID</th>
                                                                        <th className="px-10 py-6">Timestamp</th>
                                                                        <th className="px-10 py-6 text-right">Quantum (₱)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100/50">
                                                                    {dailySummary.orders.map(order => (
                                                                        <tr key={order.id} className="hover:bg-white transition-all group">
                                                                            <td className="px-10 py-5">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,1)] opacity-0 group-hover:opacity-100 transition-all"></div>
                                                                                    <span className="text-xs font-black text-gray-900 tracking-tight">#{order.order_number}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase">
                                                                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </td>
                                                                            <td className="px-10 py-5 text-right font-black text-gray-900">
                                                                                ₱{parseFloat(order.total_amount).toLocaleString()}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-20 text-center">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                                                <Clock size={32} />
                                            </div>
                                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No closing data found for this period</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-10 bg-yellow-50 border border-yellow-100 rounded-[2.5rem] flex items-start gap-6">
                                    <AlertCircle size={24} className="text-yellow-600 shrink-0 mt-1" />
                                    <div>
                                        <p className="text-xs font-black text-yellow-900 uppercase tracking-tight mb-2">Accounting Compliance Note</p>
                                        <p className="text-[11px] text-yellow-800 leading-relaxed font-medium">
                                            Manual posting ensures audit integrity by allowing a manager to verify total receipts before they are inscribed in the Master Ledger.
                                            Once posted, these orders will be marked as "Finalized" and cannot be unposted without a reversal entry.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'journal' && (
                        <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-gray-200/20 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                                <div>
                                    <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em] mb-1">Master Transaction Ledger</h3>
                                    <p className="text-[11px] text-gray-400 uppercase font-black tracking-widest">Multi-Source Auditing &middot; POS | Inventory | Expenses</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left font-data-table">
                                    <thead className="bg-[#FBFCFE] text-gray-400 uppercase tracking-[0.3em] text-[10px] font-black border-b border-gray-100">
                                        <tr>
                                            <th className="px-10 py-8">Timestamp</th>
                                            <th className="px-10 py-8">Origin</th>
                                            <th className="px-10 py-8">Reference</th>
                                            <th className="px-10 py-8">Account Identity</th>
                                            <th className="px-10 py-8">Transaction Memo</th>
                                            <th className="px-10 py-8 text-right text-green-600">Debit</th>
                                            <th className="px-10 py-8 text-right text-red-600">Credit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {journal.length > 0 ? journal.map((item, idx) => {
                                            const isFirstInTransaction = idx === 0 || journal[idx - 1].journal_id !== item.journal_id;
                                            return (
                                                <tr 
                                                    key={item.ledger_id} 
                                                    onClick={() => isFirstInTransaction && openTransactionDetails(item.journal_id)}
                                                    className={`hover:bg-cyan-50/30 transition-all text-sm group cursor-pointer ${isFirstInTransaction ? 'border-t-2 border-gray-100' : 'border-t border-gray-50'}`}
                                                >
                                                    <td className="px-10 py-5 text-gray-400 font-bold overflow-hidden whitespace-nowrap max-w-[120px]">
                                                        {isFirstInTransaction ? new Date(item.date).toLocaleDateString() : ''}
                                                    </td>
                                                    <td className="px-10 py-5">
                                                        {isFirstInTransaction ? (
                                                            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg w-fit border border-gray-100">
                                                                {getSourceIcon(item.source_module)}
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{item.source_module}</span>
                                                            </div>
                                                        ) : ''}
                                                    </td>
                                                    <td className="px-10 py-5 font-mono text-cyan-600 font-black tracking-tighter uppercase whitespace-nowrap overflow-hidden max-w-[150px]">
                                                        {isFirstInTransaction ? item.reference_no : ''}
                                                    </td>
                                                    <td className="px-10 py-5 font-bold text-gray-900">
                                                        <div className="flex flex-col">
                                                            <span>{item.account_name}</span>
                                                            <span className="text-[10px] text-gray-400 font-mono">{item.account_code}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-5 text-gray-500 italic max-w-xs truncate">
                                                        {isFirstInTransaction ? (
                                                            <div className="flex items-center justify-between">
                                                                <span className="truncate">{item.description}</span>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); openTransactionDetails(item.journal_id); }}
                                                                    className="ml-2 p-2 bg-white rounded-lg border border-gray-100 text-cyan-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-cyan-50 shadow-sm"
                                                                >
                                                                    <Search size={14} />
                                                                </button>
                                                            </div>
                                                        ) : ''}
                                                    </td>
                                                    <td className="px-10 py-5 text-right font-black text-base text-green-600">
                                                        {parseFloat(item.debit || 0) > 0 ? `₱${parseFloat(item.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                                                    </td>
                                                    <td className="px-10 py-5 text-right font-black text-base text-red-600">
                                                        {parseFloat(item.credit || 0) > 0 ? `₱${parseFloat(item.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan="7" className="px-10 py-32 text-center text-gray-300 font-black uppercase tracking-[0.5em] text-xs">Journal Clear &middot; Awaiting System Activity</td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {journal.length > 0 && (
                                        <tfoot className="bg-[#0A0F0D] text-white border-t-4 border-cyan-500">
                                            <tr>
                                                <td colSpan="5" className="px-10 py-8 text-right font-black uppercase tracking-[0.3em] text-[10px] text-cyan-400">Total Verification Balance</td>
                                                <td className="px-10 py-8 text-right font-black text-lg">
                                                    ₱{journal.reduce((sum, item) => sum + parseFloat(item.debit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-10 py-8 text-right font-black text-lg">
                                                    ₱{journal.reduce((sum, item) => sum + parseFloat(item.credit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payables' && (
                        <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-gray-200/20 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-10 border-b border-gray-50 flex justify-between items-center">
                                <div>
                                    <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em] mb-1">Liability Log Matrix</h3>
                                    <p className="text-[11px] text-gray-400 uppercase font-black tracking-widest">Active Accounts Payable &middot; Deferred Settlements</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left font-data-table">
                                    <tbody className="divide-y divide-gray-50">
                                        {payables.length > 0 ? payables.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50/50 transition-all text-sm group">
                                                <td className="px-10 py-8 text-gray-400 font-bold">{new Date(item.date_incurred).toLocaleDateString()}</td>
                                                <td className="px-10 py-8 font-black text-gray-900 uppercase">{item.vendor_name || 'N/A'}</td>
                                                <td className="px-10 py-8 font-black text-lg text-right">₱{parseFloat(item.total_amount).toLocaleString()}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="3" className="px-10 py-32 text-center text-gray-300 font-black uppercase tracking-[0.5em] text-xs">Liability Clear &middot; Zero Balance</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'coa' && (
                        <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-gray-200/20 border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-500">
                            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                                <div>
                                    <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em] mb-1">Chart of Accounts Matrix</h3>
                                    <p className="text-[11px] text-gray-400 uppercase font-black tracking-widest">Master Hierarchy &middot; Main Account &gt; Sub Accounts</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left font-data-table">
                                    <thead className="bg-[#FBFCFE] text-gray-400 uppercase tracking-[0.3em] text-[10px] font-black border-b border-gray-100">
                                        <tr>
                                            <th className="px-10 py-8 w-48">Protocol Code</th>
                                            <th className="px-10 py-8">Account Identity</th>
                                            <th className="px-10 py-8 w-32">Class</th>
                                            <th className="px-10 py-8 text-right w-40">Total Debit</th>
                                            <th className="px-10 py-8 text-right w-40">Total Credit</th>
                                            <th className="px-10 py-8 text-right w-40">Balance</th>
                                            <th className="px-10 py-8 w-48">Category Label</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {accountTree.map(acc => (
                                            <AccountRow key={acc.id} account={acc} />
                                        ))}
                                    </tbody>
                                    {accounts.length > 0 && (
                                        <tfoot className="bg-gray-900 text-white border-t-2 border-gray-100">
                                            <tr>
                                                <td colSpan="3" className="px-10 py-8 text-right font-black uppercase tracking-[0.3em] text-[10px] text-gray-500">Trial Balance Totals</td>
                                                <td className="px-10 py-8 text-right font-black text-sm text-green-400">
                                                    ₱{accounts.reduce((sum, a) => sum + parseFloat(a.total_debit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-10 py-8 text-right font-black text-sm text-red-400">
                                                    ₱{accounts.reduce((sum, a) => sum + parseFloat(a.total_credit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-10 py-8 text-right font-black text-xs text-cyan-400">
                                                    NET: ₱{(accounts.reduce((sum, a) => sum + parseFloat(a.total_debit || 0), 0) - accounts.reduce((sum, a) => sum + parseFloat(a.total_credit || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Account Modal */}
                {showAccountModal && (
                    <div className="fixed inset-0 bg-[#0A0F0D]/70 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in duration-500">
                            <div className="p-12 border-b border-gray-100 flex justify-between items-center bg-[#0A0F0D] text-white">
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tight leading-none mb-1">{editingAccount ? 'Update' : 'Initialize'} Account</h2>
                                    <p className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.4em]">Configuration Protocol</p>
                                </div>
                                <button onClick={() => setShowAccountModal(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-all"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleAccountSubmit} className="p-12 space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Protocol Identifier</label>
                                        <input
                                            type="text" required value={accountForm.code}
                                            onChange={e => setAccountForm({ ...accountForm, code: e.target.value })}
                                            className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] font-black text-lg focus:border-cyan-500 focus:outline-none transition-all"
                                            placeholder="CODE"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Type Classification</label>
                                        <select
                                            className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest focus:border-cyan-500 focus:outline-none transition-all"
                                            value={accountForm.type}
                                            onChange={e => setAccountForm({ ...accountForm, type: e.target.value })}
                                        >
                                            {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Identity Label</label>
                                    <input
                                        type="text" required value={accountForm.name}
                                        onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
                                        className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] font-black text-base focus:border-cyan-500 focus:outline-none transition-all uppercase tracking-tight"
                                        placeholder="ACCOUNT NAME"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Parent Hierarchy</label>
                                    <select
                                        className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] font-bold text-sm focus:border-cyan-500 focus:outline-none transition-all"
                                        value={accountForm.parent_id}
                                        onChange={e => setAccountForm({ ...accountForm, parent_id: e.target.value })}
                                    >
                                        <option value="">STANDALONE ROOT</option>
                                        {accounts.filter(a => a.is_header && a.id !== editingAccount?.id).map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 group">
                                    <input
                                        type="checkbox" id="is_header_modal"
                                        checked={accountForm.is_header}
                                        onChange={e => setAccountForm({ ...accountForm, is_header: e.target.checked })}
                                        className="w-6 h-6 rounded-lg accent-[#0A0F0D]"
                                    />
                                    <label htmlFor="is_header_modal" className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] cursor-pointer group-hover:text-cyan-600 transition-colors leading-relaxed">Establish as Logic Header (Non-Posting Account)</label>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-[#0A0F0D] text-white px-10 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] hover:bg-cyan-600 hover:shadow-cyan-600/30 transition-all active:scale-95"
                                >
                                    {editingAccount ? 'Finalize Modification' : 'Confirm Initialization'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Expense / Journal Modal */}
                {showExpenseModal && (
                    <div className="fixed inset-0 bg-[#0A0F0D]/80 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[4rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-12 duration-700">
                            <div className="bg-[#0A0F0D] p-12 text-white relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                                <div className="relative z-10 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">Journal Injection</h2>
                                        <p className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.4em]">Ledger Transaction Protocol</p>
                                    </div>
                                    <button onClick={() => setShowExpenseModal(false)} className="w-14 h-14 bg-white/5 text-gray-400 hover:text-white rounded-full flex items-center justify-center transition-all border border-white/10 hover:rotate-90"><Calculator size={28} /></button>
                                </div>
                            </div>
                            <form onSubmit={handleRecordExpense} className="p-12 space-y-8 max-h-[75vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <Calendar size={12} className="text-cyan-500" />
                                            Protocol Date
                                        </label>
                                        <input
                                            type="date" required value={expenseForm.date}
                                            onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                                            className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] font-black text-sm text-gray-700 focus:outline-none focus:border-cyan-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <Hash size={12} className="text-cyan-500" />
                                            Ref / Invoice #
                                        </label>
                                        <input
                                            type="text" value={expenseForm.reference_no}
                                            onChange={e => setExpenseForm({ ...expenseForm, reference_no: e.target.value })}
                                            className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] font-bold text-sm text-gray-900 focus:outline-none focus:border-cyan-500 transition-all"
                                            placeholder="INV-0000"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <User size={12} className="text-cyan-500" />
                                        Entity / Payee Link
                                    </label>
                                    <select
                                        className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] font-black text-[11px] uppercase tracking-widest focus:outline-none focus:border-cyan-500 transition-all"
                                        value={expenseForm.vendor_id}
                                        onChange={e => setExpenseForm({ ...expenseForm, vendor_id: e.target.value })}
                                    >
                                        <option value="">SELECT CORPORATE ENTITY...</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <ArrowDownCircle size={12} className="text-red-500" />
                                            Debit Target (Expense)
                                        </label>
                                        <select
                                            required className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] font-black text-[10px] uppercase tracking-widest focus:outline-none focus:border-cyan-500 transition-all"
                                            value={expenseForm.debit_account_id}
                                            onChange={e => setExpenseForm({ ...expenseForm, debit_account_id: e.target.value })}
                                        >
                                            <option value="">CHOOSE SUB-ACCOUNT...</option>
                                            {accounts.filter(a => a.type === 'Expense' && !a.is_header).map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.code} &middot; {acc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <ArrowUpCircle size={12} className="text-green-500" />
                                            Credit Origin (Asset)
                                        </label>
                                        <select
                                            required className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] font-black text-[10px] uppercase tracking-widest focus:outline-none focus:border-cyan-500 transition-all"
                                            value={expenseForm.credit_account_id}
                                            onChange={e => setExpenseForm({ ...expenseForm, credit_account_id: e.target.value })}
                                        >
                                            <option value="">CHOOSE SOURCE...</option>
                                            {accounts.filter(a => ['Asset', 'Liability'].includes(a.type) && !a.is_header).map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.code} &middot; {acc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <Wallet size={12} className="text-cyan-500" />
                                            Net Quantum (Subtotal)
                                        </label>
                                        <input
                                            type="number" step="0.01" required value={expenseForm.amount}
                                            onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                            className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] font-black text-2xl tracking-tighter text-gray-900 focus:outline-none focus:border-cyan-500 transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <Percent size={12} className="text-cyan-500" />
                                            Tax / VAT Component
                                        </label>
                                        <input
                                            type="number" step="0.01" value={expenseForm.tax_amount}
                                            onChange={e => setExpenseForm({ ...expenseForm, tax_amount: e.target.value })}
                                            className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] font-black text-2xl tracking-tighter text-gray-400 focus:outline-none focus:border-cyan-500 transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="p-8 bg-cyan-600 rounded-[2.5rem] shadow-xl shadow-cyan-600/20 text-white flex justify-between items-center group overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">Total Injection Value</p>
                                        <h3 className="text-5xl font-black tracking-tighter leading-none">₱{totalExpenseAmount}</h3>
                                    </div>
                                    <div className="relative z-10 text-right">
                                        <div className="inline-block px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/5">
                                            <span className="text-[10px] font-black uppercase tracking-widest">Type: DEBIT/CREDIT</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Liquidity State</label>
                                        <select
                                            className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] focus:outline-none focus:border-cyan-500 transition-all shadow-sm"
                                            value={expenseForm.payment_status}
                                            onChange={e => setExpenseForm({ ...expenseForm, payment_status: e.target.value })}
                                        >
                                            <option value="paid">✅ SETTLED IMMEDIATELY</option>
                                            <option value="pending">⏳ DEFERRED LIABILITY (PAYABLE)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Narrative / Memo</label>
                                        <input
                                            type="text" value={expenseForm.description}
                                            onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                            className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] font-bold text-sm"
                                            placeholder="Intelligence details..."
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-[#0A0F0D] text-cyan-400 px-10 py-7 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-cyan-900/30 hover:bg-cyan-600 hover:text-white transition-all active:scale-[0.98] group"
                                >
                                    <span className="group-hover:tracking-[0.6em] transition-all">Authorize Final Injection</span>
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Opening Balance Modal */}
                {showOBModal && targetAccount && (
                    <div className="fixed inset-0 bg-[#0A0F0D]/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                        <div className="bg-white rounded-[3.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase">Set Opening Balance</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                        {targetAccount.code} &middot; {targetAccount.name}
                                    </p>
                                </div>
                                <button onClick={() => setShowOBModal(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSetOpeningBalance} className="p-10 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Opening Quantum (Amount)</label>
                                    <input
                                        type="number" step="0.01" required autoFocus
                                        value={obForm.amount}
                                        onChange={e => setObForm({ ...obForm, amount: e.target.value })}
                                        className="w-full px-8 py-6 bg-gray-50 border border-gray-100 rounded-[2rem] font-black text-3xl tracking-tighter text-gray-900 focus:outline-none focus:border-cyan-500 transition-all"
                                        placeholder="0.00"
                                    />
                                    <p className="text-[10px] text-gray-400 font-bold uppercase italic ml-1">
                                        * This creates a balancing entry against Opening Balance Equity.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Migration Date</label>
                                    <input
                                        type="date" required
                                        value={obForm.date}
                                        onChange={e => setObForm({ ...obForm, date: e.target.value })}
                                        className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] font-bold text-gray-900 focus:outline-none focus:border-cyan-500 transition-all"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-[#0A0F0D] text-white px-10 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-xl hover:bg-cyan-600 transition-all"
                                >
                                    Inscribe Opening State
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Migration Assistant Modal */}
                {showMigrationModal && (
                    <div className="fixed inset-0 bg-[#0A0F0D]/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
                        <div className="bg-white rounded-[4rem] w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500 overflow-hidden">
                            <div className="p-12 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-2">Financial Migration Assistant</h2>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Initial System Anchoring &middot; Master Opening Balances</p>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={fetchData} className="p-4 hover:bg-gray-200/50 rounded-3xl transition-all text-cyan-600">
                                        <Zap size={24} />
                                    </button>
                                    <button onClick={() => setShowMigrationModal(false)} className="p-4 hover:bg-gray-200/50 rounded-3xl transition-all">
                                        <X size={24} className="text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-12 space-y-12">
                                {/* Debug info */}
                                <div className="bg-gray-100 p-4 rounded-xl text-[10px] font-mono text-gray-600">
                                    Accounts in state: {accounts.length} | Non-headers: {accounts.filter(a => String(a.is_header) !== 'true').length}
                                </div>

                                <div className="bg-amber-50 border border-amber-100 p-8 rounded-[2.5rem] flex gap-6 items-start">
                                    <AlertCircle className="text-amber-600 shrink-0" size={24} />
                                    <div>
                                        <p className="text-xs font-black text-amber-900 uppercase tracking-tight mb-2">Critical Migration Note</p>
                                        <p className="text-[11px] text-amber-800 leading-relaxed font-bold">
                                            Enter your current trial balance below. Positive numbers for Assets/Expenses represent Debits. Positive numbers for Liabilities/Equity/Revenue represent Credits.
                                            The system will automatically generate a balancing entry in <span className="text-amber-950 font-black">Opening Balance Equity</span>.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-10 items-end">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Migration Effective Date</label>
                                        <input
                                            type="date"
                                            value={migrationDate}
                                            onChange={e => setMigrationDate(e.target.value)}
                                            className="px-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-black text-xs text-gray-900 focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                </div>

                                <div className="overflow-hidden border border-gray-100 rounded-[2.5rem]">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                            <tr>
                                                <th className="px-10 py-6">Code</th>
                                                <th className="px-10 py-6">Account Identity</th>
                                                <th className="px-10 py-6">Classification</th>
                                                <th className="px-10 py-6 text-right">Opening Balance (₱)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {accounts.filter(a => String(a.is_header) !== 'true').length > 0 ? (
                                                accounts.filter(a => String(a.is_header) !== 'true').map(acc => (
                                                    <tr key={acc.id} className="hover:bg-gray-50/50 transition-all font-bold">
                                                        <td className="px-10 py-6 font-mono text-cyan-500 text-xs">{acc.code}</td>
                                                        <td className="px-10 py-6 text-xs text-gray-900 uppercase tracking-tight">{acc.name}</td>
                                                        <td className="px-10 py-6">
                                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-gray-100 rounded-lg text-gray-500">
                                                                {acc.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-10 py-4 text-right">
                                                            <input
                                                                type="number"
                                                                placeholder="0.00"
                                                                value={migrationEntries[acc.id] || ''}
                                                                onChange={e => setMigrationEntries({
                                                                    ...migrationEntries,
                                                                    [acc.id]: e.target.value
                                                                })}
                                                                className="w-40 px-6 py-4 bg-gray-50 border border-gray-100 rounded-xl text-right font-black text-sm text-gray-900 focus:bg-white focus:border-cyan-500 transition-all"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="px-10 py-32 text-center">
                                                        <div className="max-w-sm mx-auto">
                                                            <div className="w-16 h-16 bg-cyan-50 text-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                                                <Landmark size={32} />
                                                            </div>
                                                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">No Accounts Found</h3>
                                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-10 leading-relaxed">
                                                                This company doesn't have a Chart of Accounts yet. We can initialize a professional standard set for you.
                                                            </p>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        const res = await fetchWithAuth(`${API_URL}/accounting/accounts/initialize-defaults`, { method: 'POST' });
                                                                        const data = await res.json();
                                                                        if (data.success) {
                                                                            alert('Default accounts initialized!');
                                                                            fetchData();
                                                                        } else {
                                                                            alert('Error: ' + data.error);
                                                                        }
                                                                    } catch (err) {
                                                                        alert('Initialization failed');
                                                                    }
                                                                }}
                                                                className="bg-cyan-600 text-white px-10 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-cyan-500/30 hover:bg-cyan-500 transition-all"
                                                            >
                                                                Initialize Standard COA
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="p-12 border-t border-gray-100 bg-gray-50/30 flex justify-end">
                                <button
                                    onClick={handleBatchMigration}
                                    className="bg-[#0A0F0D] text-white px-12 py-7 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-cyan-600 transition-all active:scale-95 group"
                                >
                                    <span className="group-hover:tracking-[0.6em] transition-all">Finalize Migration Protocol</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Transaction Details Modal */}
                {showTransactionModal && selectedTransaction && (
                    <div className="fixed inset-0 bg-[#0A0F0D]/80 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[4rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                            <div className="bg-[#0A0F0D] p-12 text-white relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                                <div className="relative z-10 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="px-3 py-1 bg-cyan-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                ID: {selectedTransaction.id.substring(0, 8)}
                                            </span>
                                            <span className="px-3 py-1 bg-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-cyan-400 border border-white/5">
                                                Source: {selectedTransaction.source_module}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">Transaction Audit</h2>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em]">Master Ledger Verification</p>
                                    </div>
                                    <button onClick={() => setShowTransactionModal(false)} className="w-14 h-14 bg-white/5 text-gray-400 hover:text-white rounded-full flex items-center justify-center transition-all border border-white/10 hover:rotate-90">
                                        <X size={28} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-12 space-y-10">
                                <div className="grid grid-cols-2 gap-10">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Timestamp</p>
                                        <p className="text-xl font-black text-gray-900">{new Date(selectedTransaction.date).toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference Protocol</p>
                                        <p className="text-xl font-black text-cyan-600 font-mono italic">{selectedTransaction.reference_no}</p>
                                    </div>
                                </div>
                                
                                <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 italic font-medium text-gray-600">
                                    " {selectedTransaction.description} "
                                </div>
                                
                                <div className="overflow-hidden border border-gray-100 rounded-[2.5rem]">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-100/50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                            <tr>
                                                <th className="px-10 py-6">Account Hierarchy</th>
                                                <th className="px-10 py-6 text-right text-green-600">Debit (₱)</th>
                                                <th className="px-10 py-6 text-right text-red-600">Credit (₱)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {selectedTransaction.entries.map((entry, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition-all font-bold">
                                                    <td className="px-10 py-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-gray-900 uppercase tracking-tight">{entry.account_name}</span>
                                                            <span className="text-[9px] text-gray-400 font-mono tracking-widest">{entry.account_code}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6 text-right text-base text-gray-900">
                                                        {parseFloat(entry.debit) > 0 ? parseFloat(entry.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                                                    </td>
                                                    <td className="px-10 py-6 text-right text-base text-gray-900">
                                                        {parseFloat(entry.credit) > 0 ? parseFloat(entry.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-[#FBFCFE] border-t border-gray-100">
                                            <tr>
                                                <td className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Balanced Quantum</td>
                                                <td className="px-10 py-6 text-right font-black text-lg text-gray-900">
                                                    ₱{selectedTransaction.entries.reduce((sum, e) => sum + parseFloat(e.debit), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-10 py-6 text-right font-black text-lg text-gray-900">
                                                    ₱{selectedTransaction.entries.reduce((sum, e) => sum + parseFloat(e.credit), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                
                                <button 
                                    onClick={() => setShowTransactionModal(false)}
                                    className="w-full py-6 bg-gray-50 text-gray-400 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] hover:bg-gray-100 hover:text-gray-600 transition-all border border-dashed border-gray-200"
                                >
                                    Dismiss Audit View
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}