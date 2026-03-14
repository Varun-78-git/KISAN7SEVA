import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  ExternalLink, 
  Landmark, 
  ShieldCheck, 
  CreditCard, 
  Coins, 
  Tractor,
  User,
  MapPin,
  Leaf,
  Info,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GovernmentScheme as Scheme, AgriculturalLoan as Loan, Language } from '../types';
import { TRANSLATIONS, GOVERNMENT_SCHEMES as SCHEMES, AGRICULTURAL_LOANS as LOANS, INDIAN_STATES } from '../constants';
import { translateSchemesAndLoans } from '../services/gemini';

interface SchemesAndLoansProps {
  language: Language;
  onBack: () => void;
}

const SchemesAndLoans: React.FC<SchemesAndLoansProps> = ({ language, onBack }) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFarmerType, setSelectedFarmerType] = useState('All');
  const [selectedCropType, setSelectedCropType] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [activeTab, setActiveTab] = useState<'schemes' | 'loans'>('schemes');
  
  const [translatedSchemes, setTranslatedSchemes] = useState<Scheme[]>(SCHEMES);
  const [translatedLoans, setTranslatedLoans] = useState<Loan[]>(LOANS);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const translate = async () => {
      if (language === 'en') {
        setTranslatedSchemes(SCHEMES);
        setTranslatedLoans(LOANS);
        return;
      }

      setIsTranslating(true);
      try {
        const result = await translateSchemesAndLoans(SCHEMES, LOANS, language);
        setTranslatedSchemes(result.schemes);
        setTranslatedLoans(result.loans);
      } catch (err) {
        console.error("Translation failed, falling back to English:", err);
      } finally {
        setIsTranslating(false);
      }
    };

    translate();
  }, [language]);

  const farmerTypes = ['All', 'Small Farmer', 'Marginal Farmer', 'Large Farmer'];
  const cropTypes = ['All', 'Wheat', 'Rice', 'Cotton', 'Maize', 'Sugarcane'];
  const locations = ['All', 'All India', ...INDIAN_STATES];

  const filteredSchemes = useMemo(() => {
    return translatedSchemes.filter(scheme => {
      const matchesSearch = scheme.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           scheme.benefits.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFarmerType = selectedFarmerType === 'All' || scheme.farmerType.includes('All') || scheme.farmerType.includes(selectedFarmerType);
      const matchesCropType = selectedCropType === 'All' || scheme.cropType.includes('All') || scheme.cropType.includes(selectedCropType);
      const matchesLocation = selectedLocation === 'All' || scheme.location.includes('All India') || scheme.location.includes(selectedLocation);
      
      return matchesSearch && matchesFarmerType && matchesCropType && matchesLocation;
    });
  }, [searchQuery, selectedFarmerType, selectedCropType, selectedLocation, translatedSchemes]);

  const filteredLoans = useMemo(() => {
    return translatedLoans.filter(loan => {
      const matchesSearch = loan.bankName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           loan.loanType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFarmerType = selectedFarmerType === 'All' || loan.farmerType.includes('All') || loan.farmerType.includes(selectedFarmerType);
      const matchesLocation = selectedLocation === 'All' || loan.location.includes('All India') || loan.location.includes(selectedLocation);
      
      return matchesSearch && matchesFarmerType && matchesLocation;
    });
  }, [searchQuery, selectedFarmerType, selectedLocation, translatedLoans]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Landmark': return <Landmark className="w-6 h-6" />;
      case 'ShieldCheck': return <ShieldCheck className="w-6 h-6" />;
      case 'CreditCard': return <CreditCard className="w-6 h-6" />;
      case 'Coins': return <Coins className="w-6 h-6" />;
      case 'Tractor': return <Tractor className="w-6 h-6" />;
      default: return <Info className="w-6 h-6" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.schemesAndLoans}</h2>
          <p className="text-gray-500">{t.personalizedRecs}</p>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col gap-4 sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 py-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchSchemes}
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-gray-100 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all shadow-sm"
          />
        </div>

        <div className="flex bg-gray-200 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('schemes')}
            className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${activeTab === 'schemes' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {t.govSchemes}
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${activeTab === 'loans' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {t.lowInterestLoans}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
            <User className="w-4 h-4" /> {t.farmerType}
          </label>
          <select 
            value={selectedFarmerType}
            onChange={(e) => setSelectedFarmerType(e.target.value)}
            className="w-full p-3 bg-white rounded-xl border-2 border-gray-100 outline-none focus:border-green-500 transition-all"
          >
            {farmerTypes.map(type => {
              const key = type.charAt(0).toLowerCase() + type.slice(1).replace(' ', '');
              return (
                <option key={type} value={type}>
                  {type === 'All' ? t.all : t[key] || type}
                </option>
              );
            })}
          </select>
        </div>

        {activeTab === 'schemes' && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <Leaf className="w-4 h-4" /> {t.cropType}
            </label>
            <select 
              value={selectedCropType}
              onChange={(e) => setSelectedCropType(e.target.value)}
              className="w-full p-3 bg-white rounded-xl border-2 border-gray-100 outline-none focus:border-green-500 transition-all"
            >
              {cropTypes.map(type => (
                <option key={type} value={type}>{type === 'All' ? t.all : t.crops[type] || type}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> {t.location}
          </label>
          <select 
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full p-3 bg-white rounded-xl border-2 border-gray-100 outline-none focus:border-green-500 transition-all"
          >
            {locations.map(loc => (
              <option key={loc} value={loc}>
                {loc === 'All' ? t.all : loc === 'All India' ? t.allIndia : t.states?.[loc] || loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-4">
        {isTranslating ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
            <p className="text-gray-500 font-medium animate-pulse">Translating information to your language...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
          {activeTab === 'schemes' ? (
            <motion.div 
              key="schemes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4"
            >
              {filteredSchemes.map((scheme: Scheme) => (
                <motion.div 
                  key={scheme.id}
                  layout
                  className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-green-200 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors">
                      <Landmark className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{scheme.name}</h3>
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t.benefits}</p>
                          <p className="text-gray-700 leading-relaxed">{scheme.benefits}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t.eligibility}</p>
                          <p className="text-gray-600 text-sm">{scheme.eligibility}</p>
                        </div>
                        <a 
                          href={scheme.applicationLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 text-green-600 font-bold hover:text-green-700 transition-colors"
                        >
                          {t.applyNow} <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="loans"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4"
            >
              {filteredLoans.map((loan: Loan) => (
                <motion.div 
                  key={loan.id}
                  layout
                  className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{loan.loanType}</h3>
                          <p className="text-sm font-medium text-gray-500">{loan.bankName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.interestRate}</p>
                          <p className="text-lg font-bold text-blue-600">{loan.interestRate}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t.loanAmount}</p>
                          <p className="font-bold text-gray-900">{loan.maxAmount}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t.repaymentPeriod}</p>
                          <p className="font-bold text-gray-900">{loan.repaymentPeriod}</p>
                        </div>
                      </div>

                      <button className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95">
                        {t.applyNow}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default SchemesAndLoans;
