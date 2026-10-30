import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from './AuthContext';

const CompanyContext = createContext();

export const CompanyProvider = ({ children }) => {
    const { user } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(() => {
        try {
            const saved = localStorage.getItem('selectedCompany');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed._id) return parsed;
            }
            const userInfoRaw = localStorage.getItem('userInfo');
            if (userInfoRaw) {
                const userInfo = JSON.parse(userInfoRaw);
                if (userInfo?.company && typeof userInfo.company === 'object' && userInfo.company._id) {
                    return userInfo.company;
                }
            }
        } catch (e) {}
        return null;
    });
    const [loading, setLoading] = useState(() => !selectedCompany);

    // Global Date State
    const getTodayDate = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    const [selectedDate, setSelectedDate] = useState(getTodayDate());

    useEffect(() => {
        fetchCompanies();
    }, [user]);

    const updateSelectedCompanyIfChanged = (nextCompany) => {
        if (!nextCompany) return;
        localStorage.setItem('selectedCompany', JSON.stringify(nextCompany));
        setSelectedCompany(prev => {
            if (prev && JSON.stringify(prev) === JSON.stringify(nextCompany)) {
                return prev;
            }
            return nextCompany;
        });
    };

    const fetchCompanies = async () => {
        try {
            const userInfoRaw = localStorage.getItem('userInfo');
            if (!userInfoRaw) {
                setLoading(false);
                return;
            }
            const userInfo = JSON.parse(userInfoRaw);

            const { data } = await axios.get('/api/auth/companies');
            setCompanies(data);

            // 🛠️ MULTI-TENANCY SYNC: Always prioritize the logged-in user's company
            if (userInfo && userInfo.company) {
                const userCompanyId = (typeof userInfo.company === 'string' ? userInfo.company : (userInfo.company._id || userInfo.company));
                
                // Find full company object from the fetched list
                const fullCompany = data.find(c => c._id === userCompanyId);
                
                if (fullCompany) {
                    if (fullCompany.logoUrl && fullCompany.logoUrl.includes('superadmin.yatreedestination.com')) {
                        fullCompany.logoUrl = '';
                    }
                    updateSelectedCompanyIfChanged(fullCompany);
                } else {
                    // Critical Fix: If user's company not in fetched list, force the first available
                    if (data.length > 0) {
                        const first = { ...data[0] };
                        if (first.logoUrl && first.logoUrl.includes('superadmin.yatreedestination.com')) {
                            first.logoUrl = '';
                        }
                        updateSelectedCompanyIfChanged(first);
                    }
                }
            } else if (data.length > 0) {
                const first = { ...data[0] };
                if (first.logoUrl && first.logoUrl.includes('superadmin.yatreedestination.com')) {
                    first.logoUrl = '';
                }
                updateSelectedCompanyIfChanged(first);
            }
        } catch (err) {
            console.error('Error fetching companies', err);
            // If fetching fails, clear stale data to force a re-fetch/re-login
            localStorage.removeItem('selectedCompany');
        } finally {
            setLoading(false);
        }
    };

    const changeCompany = (company) => {
        updateSelectedCompanyIfChanged(company);
    };

    return (
        <CompanyContext.Provider value={{
            companies,
            selectedCompany,
            setSelectedCompany: changeCompany,
            refreshCompany: fetchCompanies,
            selectedDate,
            setSelectedDate,
            loading
        }}>
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = () => useContext(CompanyContext);
