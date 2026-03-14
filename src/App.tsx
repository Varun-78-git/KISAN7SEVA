import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sprout, 
  Phone, 
  Key, 
  User as UserIcon, 
  MapPin, 
  Cloud, 
  Droplets, 
  Thermometer, 
  Wind, 
  ChevronRight, 
  LogOut, 
  History, 
  Camera, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Search, 
  Languages, 
  Smartphone, 
  ArrowLeft, 
  TrendingUp, 
  Zap, 
  Leaf, 
  Info,
  Menu,
  X,
  Navigation,
  Shield,
  Calculator,
  Droplet,
  ShieldAlert,
  Clock,
  Calendar,
  ListChecks,
  Landmark,
  Banknote,
  ExternalLink,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  User,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { format } from 'date-fns';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { 
  detectDisease, 
  getLocationName, 
  getSoilInfo, 
  generateFarmingBackground, 
  getCropRecommendations, 
  searchVillages,
  getProfitAnalysis,
  getPesticideRecommendations,
  getWaterManagement,
  getSeedQuantity
} from './services/gemini';
import { 
  Farmer, 
  FarmerLog, 
  DiseaseRecord, 
  LocationInfo, 
  SoilInfo, 
  WeatherInfo, 
  Language,
  CropProfitData,
  PesticideInfo,
  IrrigationSchedule,
  GovernmentScheme,
  AgriculturalLoan
} from './types';
import SchemesAndLoans from './components/SchemesAndLoans';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  LANGUAGES, 
  TRANSLATIONS,
  GOVERNMENT_SCHEMES,
  AGRICULTURAL_LOANS
} from './constants';
import CustomCursor from './components/CustomCursor';

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, loading = false, type = 'button' }: any) => {
  const baseStyles = "px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: any = {
    primary: "bg-green-600 text-white hover:bg-green-700 shadow-md",
    secondary: "bg-brown-600 text-white hover:bg-brown-700 shadow-md",
    outline: "border-2 border-green-600 text-green-600 hover:bg-green-50",
    ghost: "text-gray-600 hover:bg-gray-100"
  };
  
  return (
    <button type={type} onClick={onClick} className={`${baseStyles} ${variants[variant]} ${className}`} disabled={disabled || loading}>
      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
};

const Input = ({ label, type = 'text', value, onChange, placeholder, icon: Icon, error }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-3 ${Icon ? 'pl-11' : ''} rounded-xl border-2 transition-all focus:ring-2 focus:ring-green-500/20 outline-none ${error ? 'border-red-500' : 'border-gray-100 focus:border-green-500'}`}
      />
    </div>
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
);

const Card = ({ children, className = "", onClick }: any) => (
  <motion.div 
    whileHover={onClick ? { scale: 1.02 } : {}}
    whileTap={onClick ? { scale: 0.98 } : {}}
    onClick={onClick}
    className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </motion.div>
);

// --- Error Boundary ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, errorInfo: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-red-50">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6 max-w-md">{this.state.errorInfo}</p>
          <Button onClick={() => window.location.reload()}>Reload Application</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App ---

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [view, setView] = useState<'splash' | 'language-select' | 'auth' | 'dashboard' | 'feature'>('splash');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [farmerData, setFarmerData] = useState<Farmer | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('preferredLanguage');
    return (saved as Language) || 'en';
  });
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(() => !!localStorage.getItem('preferredLanguage'));
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [authError, setAuthError] = useState('');
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [logs, setLogs] = useState<FarmerLog[]>([]);

  // Feature States
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [soil, setSoil] = useState<SoilInfo | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [recLandSize, setRecLandSize] = useState('');
  const [recSeason, setRecSeason] = useState('Kharif');

  // New Feature States
  const [profitData, setProfitData] = useState<CropProfitData[]>([]);
  const [pesticideInfo, setPesticideInfo] = useState<PesticideInfo | null>(null);
  const [irrigationSchedule, setIrrigationSchedule] = useState<IrrigationSchedule | null>(null);
  const [seedCalcResult, setSeedCalcResult] = useState<string>('');
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [seedAcres, setSeedAcres] = useState<string>('');
  const [isFetchingFeature, setIsFetchingFeature] = useState(false);
  const [profitViewMode, setProfitViewMode] = useState<'profit' | 'yield'>('profit');
  const [selectedProfitSeason, setSelectedProfitSeason] = useState<string>('All');

  const [bgImage, setBgImage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [authForm, setAuthForm] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    area: '',
    landSize: ''
  });

  useEffect(() => {
    const loadBg = async () => {
      try {
        const img = await generateFarmingBackground();
        setBgImage(img);
      } catch (err) {
        console.error("Failed to load background:", err);
      }
    };
    loadBg();
  }, []);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (view === 'splash') {
        if (hasSelectedLanguage) {
          setView('auth');
        } else {
          setView('language-select');
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [view, hasSelectedLanguage]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      console.log("Auth state changed:", u ? `User: ${u.uid}` : "No user");
      setUser(u);
      if (u) {
        try {
          const docRef = doc(db, 'farmers', u.uid);
          console.log("Fetching farmer profile for path:", docRef.path);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Farmer;
            console.log("Farmer profile found:", data.farmerName);
            setFarmerData(data);
            setLanguage(data.preferredLanguage);
            setNeedsProfileCompletion(false);
            setView('dashboard');
            logActivity(u.uid, t.login, `${t.welcome} ${data.farmerName}`);
          } else {
            console.log("No farmer profile found, needs completion.");
            setNeedsProfileCompletion(true);
            setAuthMode('login');
            setView('auth');
          }
        } catch (err) {
          console.error("Error fetching farmer profile:", err);
          handleFirestoreError(err, OperationType.GET, `farmers/${u.uid}`);
        }
      } else {
        if (view !== 'splash') setView('auth');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [language]);

  useEffect(() => {
    if (!user) return;
    console.log("Setting up logs listener for user:", user.uid);
    const q = query(
      collection(db, 'logs'), 
      where('farmerId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`Received ${snapshot.size} logs`);
      const newLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FarmerLog));
      setLogs(newLogs);
    }, (err) => {
      console.error("Error in logs listener:", err);
      handleFirestoreError(err, OperationType.LIST, 'logs');
    });
    return unsubscribe;
  }, [user]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const type = log.activityType;
      // Filter out login, logout, and signup logs across all supported languages
      // Also filter out any language change logs if they exist
      const isAuthLog = Object.values(TRANSLATIONS).some(trans => 
        type === trans.login || type === trans.logout || type === trans.signup
      );
      const isLanguageLog = type === "Language Change" || type === "Language Selected";
      return !isAuthLog && !isLanguageLog;
    });
  }, [logs]);

  useEffect(() => {
    if (farmerData?.area && !location) {
      fetchLocationData(farmerData.area);
    }
  }, [farmerData, location]);

  const logActivity = async (farmerId: string, type: string, details: string) => {
    try {
      await addDoc(collection(db, 'logs'), {
        farmerId,
        activityType: type,
        activityDetails: details,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Error logging activity:', err);
      handleFirestoreError(err, OperationType.CREATE, 'logs');
    }
  };

  const handleLogout = async () => {
    if (user) await logActivity(user.uid, t.logout, `${t.logout}: ${farmerData?.farmerName}`);
    setNeedsProfileCompletion(false);
    await signOut(auth);
    setView('auth');
  };

  const handleOpenKeyDialog = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      // Reload background if key was selected
      const img = await generateFarmingBackground();
      setBgImage(img);
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
    if (user && farmerData) {
      setDoc(doc(db, 'farmers', user.uid), { ...farmerData, preferredLanguage: lang }, { merge: true });
    }
  };

  const confirmLanguage = () => {
    setHasSelectedLanguage(true);
    setView('auth');
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!authForm.name) {
      setAuthError(t.enterNameError);
      return;
    }
    setLoading(true);
    try {
      let normalizedMobile = authForm.mobile.replace(/\D/g, '');
      if (normalizedMobile.length > 10) normalizedMobile = normalizedMobile.slice(-10);
      if (!normalizedMobile && user.phoneNumber) normalizedMobile = user.phoneNumber.replace(/\D/g, '').slice(-10);

      const newFarmer: any = {
        uid: user.uid,
        farmerName: authForm.name,
        mobileNumber: normalizedMobile || 'N/A',
        email: user.email || '',
        area: authForm.area,
        landSize: parseFloat(authForm.landSize) || 0,
        preferredLanguage: language,
        signupDate: serverTimestamp()
      };

      await setDoc(doc(db, 'farmers', user.uid), newFarmer);
      setFarmerData(newFarmer);
      setNeedsProfileCompletion(false);
      setView('dashboard');
      logActivity(user.uid, t.signup, `Profile Completed: ${authForm.name}`);
    } catch (err: any) {
      setAuthError(err.message);
      handleFirestoreError(err, OperationType.WRITE, `farmers/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      
      const docRef = doc(db, 'farmers', u.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        setNeedsProfileCompletion(true);
      } else {
        const data = docSnap.data() as Farmer;
        setFarmerData(data);
        setLanguage(data.preferredLanguage);
        setView('dashboard');
        logActivity(u.uid, t.login, `${t.welcome} ${data.farmerName}`);
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    try {
      let normalizedMobile = authForm.mobile.replace(/\D/g, '');
      if (normalizedMobile.length > 10) {
        normalizedMobile = normalizedMobile.slice(-10);
      }
      
      if (authMode === 'signup') {
        if (!authForm.name) throw new Error(t.enterNameError);
        if (normalizedMobile.length < 10) throw new Error(t.validMobileError);
        if (authForm.password !== authForm.confirmPassword) throw new Error(t.passwordsMismatch);
        if (authForm.password.length < 6) throw new Error(t.passwordTooShort);
        
        const email = authForm.email || `${normalizedMobile}@kisanseva.com`;
        let u;
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, authForm.password);
          u = userCredential.user;
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            const userCredential = await signInWithEmailAndPassword(auth, email, authForm.password);
            u = userCredential.user;
          } else {
            throw authErr;
          }
        }

        const newFarmer: any = {
          uid: u.uid,
          farmerName: authForm.name,
          mobileNumber: normalizedMobile,
          email: authForm.email,
          area: authForm.area,
          landSize: parseFloat(authForm.landSize) || 0,
          preferredLanguage: language,
          signupDate: serverTimestamp()
        };

        await setDoc(doc(db, 'farmers', u.uid), newFarmer);
        setFarmerData(newFarmer);
        setView('dashboard');
        logActivity(u.uid, t.signup, `${t.signup}: ${authForm.name}`);
      } else {
        if (!normalizedMobile) throw new Error(t.enterMobileError);
        const email = authForm.email || `${normalizedMobile}@kisanseva.com`;
        await signInWithEmailAndPassword(auth, email, authForm.password);
      }
    } catch (err: any) {
      setAuthError(err.message);
      if (err.message.includes('permission')) {
        handleFirestoreError(err, OperationType.WRITE, 'farmers');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPhone) return;
    setIsVerifyingOtp(true);
    try {
      // Mock OTP sending
      setTimeout(() => {
        setOtpSent(true);
        setIsVerifyingOtp(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setIsVerifyingOtp(false);
    }
  };

  const verifyOtp = () => {
    if (otpValue.length === 6) {
      alert(t.resetPasswordAlert);
      setShowForgotModal(false);
      setOtpSent(false);
      setOtpValue('');
    }
  };

  const fetchRecommendations = async () => {
    if (!location || !soil || !weather) return;
    setLoading(true);
    try {
      const recs = await getCropRecommendations(location, soil, weather, recSeason, recLandSize, language);
      setRecommendations(recs);
      if (user) {
        try {
          await addDoc(collection(db, 'recommendations'), {
            farmerId: user.uid,
            location: location.name || `${location.village}, ${location.district}`,
            soilType: soil.type,
            season: recSeason,
            recommendedCrops: recs,
            createdDate: serverTimestamp()
          });
          logActivity(user.uid, t.cropAdvisor, `${t.recommendations}: ${recs.join(', ')}`);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'recommendations');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfitAnalysis = async () => {
    setIsFetchingFeature(true);
    try {
      const data = await getProfitAnalysis(language, recommendations);
      setProfitData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingFeature(false);
    }
  };

  const fetchPesticideInfo = async (crop: string) => {
    if (!crop) return;
    setIsFetchingFeature(true);
    try {
      const info = await getPesticideRecommendations(crop, language);
      setPesticideInfo(info);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingFeature(false);
    }
  };

  const fetchWaterManagement = async (crop: string) => {
    if (!location || !crop) return;
    setIsFetchingFeature(true);
    try {
      const schedule = await getWaterManagement(location, crop, language);
      setIrrigationSchedule(schedule);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingFeature(false);
    }
  };

  const calculateSeedQuantity = async () => {
    if (!selectedCrop || !seedAcres) return;
    setIsFetchingFeature(true);
    try {
      const result = await getSeedQuantity(selectedCrop, parseFloat(seedAcres), language);
      setSeedCalcResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingFeature(false);
    }
  };

  const fetchLocationData = async (manualArea?: string) => {
    setLoading(true);
    setLoadingMessage(manualArea ? t.searchingArea : t.gettingGPS);
    try {
      if (manualArea) {
        const results = await searchVillages(manualArea, language);
        if (results.length > 0) {
          const loc = results[0];
          setLocation(loc);
          setLoadingMessage(t.fetchingSoil);
          const soilData = await getSoilInfo(loc, language);
          setSoil(soilData);
          // Mock weather
          setWeather({
            temp: 28 + Math.floor(Math.random() * 10),
            humidity: 40 + Math.floor(Math.random() * 40),
            rainChance: Math.floor(Math.random() * 100),
            windSpeed: 5 + Math.floor(Math.random() * 15),
            condition: 'Sunny'
          });
          setLoadingMessage(t.gettingRecommendations);
          const recs = await getCropRecommendations(loc, soilData, { temp: 30, humidity: 60, rainChance: 10, windSpeed: 10, condition: 'Sunny' }, recSeason, recLandSize, language);
          setRecommendations(recs);
        }
        setLoading(false);
        setLoadingMessage('');
      } else {
        if (!navigator.geolocation) {
          throw new Error("Geolocation is not supported by your browser");
        }
        
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              setLoadingMessage(t.identifyingLocation);
              const loc = await getLocationName(pos.coords.latitude, pos.coords.longitude, language);
              setLocation(loc);
              
              setLoadingMessage(t.fetchingSoil);
              const soilData = await getSoilInfo(loc, language);
              setSoil(soilData);
              
              setWeather({
                temp: 28 + Math.floor(Math.random() * 10),
                humidity: 40 + Math.floor(Math.random() * 40),
                rainChance: Math.floor(Math.random() * 100),
                windSpeed: 5 + Math.floor(Math.random() * 15),
                condition: 'Sunny'
              });
              
              setLoadingMessage(t.gettingRecommendations);
              const recs = await getCropRecommendations(loc, soilData, { temp: 30, humidity: 60, rainChance: 10, windSpeed: 10, condition: 'Sunny' }, recSeason, recLandSize, language);
              setRecommendations(recs);
            } catch (err: any) {
              console.error(err);
              setAuthError(err.message || t.locationError);
            } finally {
              setLoading(false);
              setLoadingMessage('');
            }
          },
          (err) => {
            console.error(err);
            setLoading(false);
            setLoadingMessage('');
            let msg = t.locationError;
            if (err.code === 1) msg = t.locationPermissionDenied;
            else if (err.code === 2) msg = t.locationUnavailable;
            else if (err.code === 3) msg = t.locationTimeout;
            setAuthError(msg);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        return; // Return early because getCurrentPosition is async with callbacks
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message);
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleScan = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const result = await detectDisease(base64, language);
          setScanResult(result);
          if (user) {
            try {
              await addDoc(collection(db, 'disease_records'), {
                farmerId: user.uid,
                plantName: result.plantName,
                detectedDisease: result.detectedDisease,
                recommendedTreatment: result.recommendedTreatment,
                scanDate: serverTimestamp()
              });
              logActivity(user.uid, t.diseaseScanner, `Scanned plant: ${result.plantName}`);
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, 'disease_records');
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setScanning(false);
    }
  };

  if (view === 'splash') {
    return (
      <div className="min-h-screen bg-green-600 flex flex-col items-center justify-center text-white p-6">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-6 rounded-3xl shadow-2xl mb-6"
        >
          <Sprout className="w-20 h-20 text-green-600" />
        </motion.div>
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-black tracking-tighter mb-2"
        >
          KISAN SEVA
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.5 }}
          className="text-green-100 font-medium"
        >
          {t.appSubtitle}
        </motion.p>
      </div>
    );
  }

  if (view === 'language-select') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-emerald-900">
        <CustomCursor />
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-400 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-400 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 relative z-10"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
              <Languages className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">{t.selectLanguage}</h2>
            <p className="text-gray-500">Choose your preferred language to continue</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code as Language)}
                className={clsx(
                  "p-4 rounded-2xl border-2 transition-all text-sm font-bold",
                  language === lang.code 
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700" 
                    : "border-gray-100 hover:border-emerald-200 text-gray-600"
                )}
              >
                {lang.name}
              </button>
            ))}
          </div>

          <Button 
            onClick={confirmLanguage}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-lg font-bold shadow-lg shadow-emerald-200"
          >
            {t.continue}
          </Button>
        </motion.div>
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-gray-50">
        <CustomCursor />
        {bgImage && (
          <div className="absolute inset-0 z-0">
            <img src={bgImage} className="w-full h-full object-cover opacity-20 blur-sm" alt="bg" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/40 to-white/80" />
          </div>
        )}
        
        <div className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl p-8 border border-white/50 relative z-10">
          <div className="flex justify-center mb-6">
            <div className="bg-green-600 p-4 rounded-2xl shadow-lg shadow-green-200">
              <Sprout className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-900">
            {needsProfileCompletion ? t.completeProfile : (authMode === 'login' ? t.login : t.signup)}
          </h2>
          <p className="text-gray-500 text-center mb-8 font-medium">
            {needsProfileCompletion 
              ? t.profileFoundSubtitle
              : (authMode === 'login' ? t.loginSubtitle : t.signupSubtitle)}
          </p>

          <form onSubmit={needsProfileCompletion ? handleCompleteProfile : handleAuth} className="space-y-4">
            {!needsProfileCompletion && (
              <div className="flex flex-col gap-4">
                <Button 
                  onClick={handleGoogleAuth} 
                  variant="outline" 
                  className="w-full border-gray-200 text-gray-700 hover:bg-gray-50"
                  loading={loading}
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                  {t.googleSignIn || "Sign in with Google"}
                </Button>
                
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400">Or continue with</span>
                  </div>
                </div>
              </div>
            )}
            {(authMode === 'signup' || needsProfileCompletion) && (
              <>
                <Input 
                  label={t.name} 
                  icon={UserIcon} 
                  value={authForm.name} 
                  onChange={(e: any) => setAuthForm({...authForm, name: e.target.value})} 
                />
                <Input 
                  label={t.area} 
                  icon={MapPin} 
                  value={authForm.area} 
                  onChange={(e: any) => setAuthForm({...authForm, area: e.target.value})} 
                />
                <Input 
                  label={t.landSize} 
                  icon={TrendingUp} 
                  type="number"
                  value={authForm.landSize} 
                  onChange={(e: any) => setAuthForm({...authForm, landSize: e.target.value})} 
                />
              </>
            )}
            {!needsProfileCompletion && (
              <>
                <Input 
                  label={t.mobile} 
                  icon={Phone} 
                  type="tel"
                  value={authForm.mobile} 
                  onChange={(e: any) => setAuthForm({...authForm, mobile: e.target.value})} 
                />
                <Input 
                  label={t.password} 
                  type="password" 
                  icon={Key}
                  value={authForm.password} 
                  onChange={(e: any) => setAuthForm({...authForm, password: e.target.value})} 
                />
              </>
            )}
            {authMode === 'signup' && (
              <Input 
                label={t.confirmPassword} 
                type="password" 
                icon={Key}
                value={authForm.confirmPassword} 
                onChange={(e: any) => setAuthForm({...authForm, confirmPassword: e.target.value})} 
              />
            )}

            {authError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {authError}
              </div>
            )}

            {!needsProfileCompletion && (
              <div className="flex justify-end">
                <button 
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm text-green-600 font-semibold hover:underline"
                >
                  {t.forgotPassword}
                </button>
              </div>
            )}

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200" loading={loading}>
              {needsProfileCompletion ? t.finishSetup : (authMode === 'login' ? t.login : t.signup)}
            </Button>
          </form>

          {!needsProfileCompletion && (
            <div className="mt-6 flex justify-center">
              <button 
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-green-700 font-bold hover:underline text-sm"
              >
                {authMode === 'login' ? t.newFarmer : t.alreadyRegistered}
              </button>
            </div>
          )}

          {needsProfileCompletion && (
            <div className="mt-6 flex justify-center">
              <button 
                type="button"
                onClick={handleLogout}
                className="text-gray-500 hover:underline text-sm"
              >
                {t.logout}
              </button>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-gray-200/50 flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-4">
              <Languages className="w-5 h-5 text-gray-400" />
              <select 
                value={language} 
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className="bg-transparent text-sm font-bold outline-none text-gray-700"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Forgot Password Modal */}
        <AnimatePresence>
          {showForgotModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative"
              >
                <div className="flex items-center gap-2 mb-6">
                  <button onClick={() => setShowForgotModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-bold">{t.resetPassword}</h2>
                </div>

                {!otpSent ? (
                  <div className="space-y-4">
                    <p className="text-gray-600 text-sm">{t.enterMobileOtp}</p>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                      <input
                        type="tel"
                        placeholder={t.mobileNumber}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleForgotPassword}
                      disabled={isVerifyingOtp || !forgotPhone}
                      className="w-full"
                      loading={isVerifyingOtp}
                    >
                      {t.sendOtp}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-600 text-sm">{t.enterOtpSent} {forgotPhone}</p>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder={t.enterOtp}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-center text-2xl tracking-widest font-bold"
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value)}
                    />
                    <Button
                      onClick={verifyOtp}
                      className="w-full"
                    >
                      {t.verifyOtp}
                    </Button>
                    <button 
                      onClick={() => setOtpSent(false)}
                      className="w-full text-sm text-gray-500 hover:underline"
                    >
                      {t.resendOtp}
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const FeatureHeader = ({ title, onBack }: any) => (
    <div className="flex items-center gap-4 mb-8">
      <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
        <ChevronRight className="w-6 h-6 rotate-180" />
      </button>
      <h2 className="text-2xl font-bold">{title}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 selection:bg-green-100 selection:text-green-900">
      <CustomCursor />
      
      {/* Global Loading Overlay */}
      <AnimatePresence>
        {loading && loadingMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6 border border-green-100 max-w-xs w-full mx-4"
            >
              <div className="relative">
                <div className="w-16 h-16 border-4 border-green-100 border-t-green-600 rounded-full animate-spin" />
                <Sprout className="absolute inset-0 m-auto w-6 h-6 text-green-600 animate-pulse" />
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-xl font-bold text-gray-900 leading-tight">{loadingMessage}</p>
                <p className="text-sm text-gray-500 animate-pulse">{t.pleaseWait}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-green-600 p-1.5 rounded-lg">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-green-800">KISAN SEVA</h1>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={language} 
            onChange={(e) => handleLanguageChange(e.target.value as Language)}
            className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-bold outline-none text-gray-700"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
          <button onClick={handleLogout} className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-colors">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {!activeFeature ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Welcome Card */}
              <div className="bg-green-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-green-200 relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-3xl font-bold mb-2">{t.welcome}, {farmerData?.farmerName}!</h2>
                  <p className="text-green-100 font-medium opacity-90">{t.appSubtitle}</p>
                </div>
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 opacity-10">
                  <Sprout className="w-64 h-64" />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="flex flex-col items-center justify-center text-center py-8">
                  <Thermometer className="w-8 h-8 text-orange-500 mb-2" />
                  <span className="text-2xl font-bold">{weather?.temp || '--'}°C</span>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t.temp}</span>
                </Card>
                <Card className="flex flex-col items-center justify-center text-center py-8">
                  <Droplets className="w-8 h-8 text-blue-500 mb-2" />
                  <span className="text-2xl font-bold">{soil?.moisture || '--'}%</span>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t.moisture}</span>
                </Card>
                <Card className="flex flex-col items-center justify-center text-center py-8">
                  <Cloud className="w-8 h-8 text-gray-500 mb-2" />
                  <span className="text-2xl font-bold">{weather?.rainChance || '--'}%</span>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t.rain}</span>
                </Card>
                <Card className="flex flex-col items-center justify-center text-center py-8">
                  <Wind className="w-8 h-8 text-teal-500 mb-2" />
                  <span className="text-2xl font-bold">{weather?.windSpeed || '--'} km/h</span>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t.wind}</span>
                </Card>
              </div>

              {/* Main Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card onClick={() => setActiveFeature('location')} className="group">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-4 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                      <MapPin className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">{t.locationSoilWeather}</h3>
                      <p className="text-sm text-gray-500">{location?.village || 'Set location'}</p>
                    </div>
                  </div>
                </Card>

                <Card onClick={() => setActiveFeature('recommendations')} className="group">
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-100 p-4 rounded-2xl group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                      <TrendingUp className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">{t.cropRecommendation}</h3>
                      <p className="text-sm text-gray-500">{t.bestCropsSubtitle}</p>
                    </div>
                  </div>
                </Card>

                <Card onClick={() => setActiveFeature('scanner')} className="group">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-100 p-4 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">{t.diseaseScanner}</h3>
                      <p className="text-sm text-gray-500">{t.diseaseScannerSubtitle}</p>
                    </div>
                  </div>
                </Card>

                <Card onClick={() => setActiveFeature('tech')} className="group">
                  <div className="flex items-center gap-4">
                    <div className="bg-teal-100 p-4 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
                      <Zap className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">{t.modernTech}</h3>
                      <p className="text-sm text-gray-500">{t.modernTechSubtitle}</p>
                    </div>
                  </div>
                </Card>

                <Card onClick={() => { setActiveFeature('profit'); fetchProfitAnalysis(); }} className="group">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-4 rounded-2xl group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                      <TrendingUp className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">{t.highProfitCrops}</h3>
                      <p className="text-sm text-gray-500">{t.profitAnalysisSubtitle}</p>
                    </div>
                  </div>
                </Card>

                <Card onClick={() => setActiveFeature('pesticide')} className="group">
                  <div className="flex items-center gap-4">
                    <div className="bg-red-100 p-4 rounded-2xl group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                      <Shield className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">{t.pesticideGuide}</h3>
                      <p className="text-sm text-gray-500">{t.pesticideGuideSubtitle}</p>
                    </div>
                  </div>
                </Card>

                <Card onClick={() => setActiveFeature('seed')} className="group">
                  <div className="flex items-center gap-4">
                    <div className="bg-yellow-100 p-4 rounded-2xl group-hover:bg-yellow-600 group-hover:text-white transition-all duration-300">
                      <Calculator className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">{t.seedCalculator}</h3>
                      <p className="text-sm text-gray-500">{t.seedCalculatorSubtitle}</p>
                    </div>
                  </div>
                </Card>

                <Card onClick={() => setActiveFeature('water')} className="group">
                  <div className="flex items-center gap-4">
                    <div className="bg-cyan-100 p-4 rounded-2xl group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300">
                      <Droplet className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">{t.waterManagement}</h3>
                      <p className="text-sm text-gray-500">{t.waterManagementSubtitle}</p>
                    </div>
                  </div>
                </Card>

                <Card onClick={() => setActiveFeature('schemes')} className="group md:col-span-2">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 p-4 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      <Landmark className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">{t.farmerLoansSchemes}</h3>
                      <p className="text-sm text-gray-500">{t.farmerLoansSchemesSubtitle}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-4">
                <Button onClick={() => setActiveFeature('logs')} variant="outline" className="flex-1">
                  <History className="w-5 h-5" />
                  {t.activityLogs}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="feature"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {activeFeature === 'location' && (
                <div>
                  <FeatureHeader title={t.locationSoilWeather} onBack={() => setActiveFeature(null)} />
                  <div className="space-y-6">
                    {authError && activeFeature === 'location' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm flex items-center gap-3 border border-red-100 shadow-sm"
                      >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="font-medium">{authError}</p>
                        <button onClick={() => setAuthError('')} className="ml-auto p-1 hover:bg-red-100 rounded-full transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                    <Card className="relative overflow-hidden">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="bg-blue-100 p-3 rounded-xl">
                          <Search className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 relative">
                          <input 
                            type="text" 
                            placeholder={t.area}
                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              if (e.target.value.length > 2) {
                                setIsSearching(true);
                                searchVillages(e.target.value, language).then(res => {
                                  setSearchResults(res);
                                  setIsSearching(false);
                                });
                              }
                            }}
                          />
                          {isSearching && <Loader2 className="absolute right-3 top-3.5 w-5 h-5 animate-spin text-gray-400" />}
                        </div>
                        <Button 
                          onClick={() => fetchLocationData()} 
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 flex items-center gap-2"
                          disabled={loading}
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                          <span className="hidden md:inline">{t.useCurrentLocation}</span>
                        </Button>
                      </div>

                      {location && (
                        <div className="mb-6 p-4 bg-blue-50 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-blue-600" />
                            <span className="font-bold text-blue-900">{location.name}, {location.district}, {location.state}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono text-blue-700 bg-white/50 px-3 py-1.5 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-1">
                              <span className="opacity-50">{t.latitude}:</span>
                              <span className="font-bold">{location.lat.toFixed(4)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="opacity-50">{t.longitude}:</span>
                              <span className="font-bold">{location.lng.toFixed(4)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {searchResults.length > 0 && searchQuery.length > 2 && (
                        <div className="absolute top-20 left-6 right-6 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden">
                          {searchResults.map((res, idx) => (
                            <button 
                              key={idx}
                              onClick={() => {
                                setLocation(res);
                                setSearchQuery('');
                                setSearchResults([]);
                                fetchLocationData(res.name);
                              }}
                              className="w-full text-left px-6 py-4 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-none"
                            >
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="font-bold">{res.name}</div>
                                <div className="text-xs text-gray-400">{res.district}, {res.state}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h4 className="font-bold text-gray-400 uppercase tracking-widest text-xs">{t.soilType}</h4>
                          <div className="flex items-center gap-4">
                            <div className="bg-brown-100 p-4 rounded-2xl">
                              <Leaf className="w-8 h-8 text-brown-600" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold">{soil?.type || '--'}</div>
                              <div className="text-sm text-gray-500">{t.water}: {soil?.waterAvailability || '--'}</div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h4 className="font-bold text-gray-400 uppercase tracking-widest text-xs">Nutrients (N-P-K)</h4>
                          <div className="flex gap-2">
                            <div className="flex-1 bg-green-50 p-3 rounded-xl text-center">
                              <div className="text-xs font-bold text-green-600">N</div>
                              <div className="text-lg font-bold">{soil?.n || '--'}%</div>
                            </div>
                            <div className="flex-1 bg-blue-50 p-3 rounded-xl text-center">
                              <div className="text-xs font-bold text-blue-600">P</div>
                              <div className="text-lg font-bold">{soil?.p || '--'}%</div>
                            </div>
                            <div className="flex-1 bg-orange-50 p-3 rounded-xl text-center">
                              <div className="text-xs font-bold text-orange-600">K</div>
                              <div className="text-lg font-bold">{soil?.k || '--'}%</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
                        <Thermometer className="w-6 h-6 mb-2 opacity-80" />
                        <div className="text-3xl font-bold mb-1">{weather?.temp || '--'}°C</div>
                        <div className="text-xs font-bold uppercase tracking-wider opacity-80">{t.temp}</div>
                      </Card>
                      <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-none">
                        <Droplets className="w-6 h-6 mb-2 opacity-80" />
                        <div className="text-3xl font-bold mb-1">{weather?.humidity || '--'}%</div>
                        <div className="text-xs font-bold uppercase tracking-wider opacity-80">{t.humidity}</div>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {activeFeature === 'recommendations' && (
                <div>
                  <FeatureHeader title={t.cropRecommendation} onBack={() => setActiveFeature(null)} />
                  {!location ? (
                    <div className="text-center py-20">
                      <MapPin className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-500">{t.fetchFirst}</p>
                      <Button onClick={() => setActiveFeature('location')} variant="outline" className="mt-6">{t.setLocation}</Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <Card className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input 
                            label={t.landSize}
                            type="number"
                            placeholder="e.g. 5"
                            value={recLandSize}
                            onChange={(e: any) => setRecLandSize(e.target.value)}
                          />
                          <div className="flex flex-col gap-1.5 w-full">
                            <label className="text-sm font-medium text-gray-700">{t.season}</label>
                            <select 
                              value={recSeason}
                              onChange={(e) => setRecSeason(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-green-500 transition-all focus:ring-2 focus:ring-green-500/20 outline-none bg-white"
                            >
                              <option value="Kharif">Kharif (June - October)</option>
                              <option value="Rabi">Rabi (November - March)</option>
                              <option value="Zaid">Zaid (March - June)</option>
                            </select>
                          </div>
                        </div>
                        <Button 
                          onClick={fetchRecommendations} 
                          className="w-full"
                          loading={loading}
                        >
                          {t.getRecommendations}
                        </Button>
                      </Card>

                      {recommendations.length > 0 && (
                        <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100">
                          <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            {t.suitable}
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                            {recommendations.map((crop, idx) => (
                              <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={idx} 
                                className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="bg-green-100 p-2 rounded-lg">
                                    <Leaf className="w-5 h-5 text-green-600" />
                                  </div>
                                  <span className="font-bold text-lg">{crop}</span>
                                </div>
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeFeature === 'scanner' && (
                <div>
                  <FeatureHeader title={t.diseaseScanner} onBack={() => setActiveFeature(null)} />
                  <div className="space-y-6">
                    {!scanResult ? (
                      <Card className="border-dashed border-4 border-gray-100 py-20 flex flex-col items-center justify-center text-center">
                        <div className="bg-purple-100 p-6 rounded-full mb-6">
                          <Camera className="w-12 h-12 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">{t.scanPlant}</h3>
                        <p className="text-gray-500 mb-8 max-w-xs">{t.uploadImage}</p>
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={handleScan} />
                          <div className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-purple-200 flex items-center gap-2">
                            {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            {scanning ? t.detecting : t.uploadImage}
                          </div>
                        </label>
                      </Card>
                    ) : (
                      <div className="space-y-6">
                        <Card className="bg-purple-50 border-purple-100">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-purple-900">{scanResult.plantName}</h3>
                            <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${scanResult.detectedDisease === t.healthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {scanResult.detectedDisease}
                            </div>
                          </div>
                          
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">{t.cause}</h4>
                              <p className="text-gray-700">{scanResult.cause}</p>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">{t.treatment}</h4>
                              <p className="text-gray-700">{scanResult.recommendedTreatment}</p>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">{t.prevention}</h4>
                              <p className="text-gray-700">{scanResult.preventionTips}</p>
                            </div>
                          </div>

                          <Button onClick={() => setScanResult(null)} variant="outline" className="w-full mt-8 border-purple-200 text-purple-600 hover:bg-purple-100">
                            {t.scanAnother}
                          </Button>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeFeature === 'tech' && (
                <div>
                  <FeatureHeader title={t.modernTech} onBack={() => setActiveFeature(null)} />
                  <div className="grid grid-cols-1 gap-6">
                    {t.technologies.map((tech: any) => (
                      <Card key={tech.id} className="group">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="bg-teal-100 p-3 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-all">
                            <Zap className="w-6 h-6" />
                          </div>
                          <h3 className="text-xl font-bold">{tech.name}</h3>
                        </div>
                        <p className="text-gray-600 mb-6">{tech.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                          <div>
                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t.benefits}</h5>
                            <p className="text-sm text-gray-700">{tech.benefits}</p>
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t.howToUse}</h5>
                            <p className="text-sm text-gray-700">{tech.usageMethod}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeFeature === 'profit' && (
                <div>
                  <FeatureHeader title={t.highProfitCrops} onBack={() => setActiveFeature(null)} />
                  <div className="space-y-6">
                    {isFetchingFeature ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 animate-spin text-green-600 mb-4" />
                        <p className="text-gray-500">{t.analyzingMarket}</p>
                      </div>
                    ) : (
                      <>
                        <Card className="p-6">
                          <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                            {t.profitYieldAnalysis}
                          </h3>
                          {recommendations.length > 0 && (
                            <p className="text-sm text-green-600 font-medium mb-6">{t.personalizedRecs}</p>
                          )}

                          <div className="flex flex-wrap gap-2 mb-6">
                            <button 
                              onClick={() => setProfitViewMode('profit')}
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${profitViewMode === 'profit' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {t.viewProfit}
                            </button>
                            <button 
                              onClick={() => setProfitViewMode('yield')}
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${profitViewMode === 'yield' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {t.viewYield}
                            </button>
                            <div className="w-full md:w-auto flex gap-2 mt-2 md:mt-0">
                              {[
                                { id: 'All', label: t.all || 'All' },
                                { id: 'Kharif', label: t.kharif || 'Kharif' },
                                { id: 'Rabi', label: t.rabi || 'Rabi' },
                                { id: 'Zaid', label: t.zaid || 'Zaid' }
                              ].map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => setSelectedProfitSeason(s.id)}
                                  className={`px-3 py-1 rounded-full text-xs font-bold border ${selectedProfitSeason === s.id ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200'}`}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={profitData.filter(c => selectedProfitSeason === 'All' || c.season.includes(selectedProfitSeason))} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                  dataKey="cropName" 
                                  angle={-45} 
                                  textAnchor="end" 
                                  interval={0} 
                                  height={80}
                                  tick={{ fontSize: 12, fontWeight: 'bold' }}
                                />
                                <YAxis 
                                  yAxisId="left" 
                                  orientation="left" 
                                  stroke="#16a34a" 
                                  tick={{ fontSize: 12 }}
                                  hide={profitViewMode === 'yield'}
                                />
                                <YAxis 
                                  yAxisId="right" 
                                  orientation="right" 
                                  stroke="#2563eb" 
                                  tick={{ fontSize: 12 }}
                                  hide={profitViewMode === 'profit'}
                                />
                                <Tooltip 
                                  content={({ active, payload, label }) => {
                                    if (active && label) {
                                      const cropData = profitData.find(c => c.cropName === label);
                                      if (!cropData) return null;

                                      return (
                                        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 min-w-[200px]">
                                          <p className="font-bold text-gray-900 mb-1 border-b pb-1">{label}</p>
                                          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">{cropData.season}</p>
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-4 text-sm">
                                              <span className="text-green-600 font-medium">{t.estimatedProfit}:</span>
                                              <span className="font-mono font-bold text-green-700">₹{cropData.estimatedProfit.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 text-sm">
                                              <span className="text-red-500 font-medium">{t.totalCost}:</span>
                                              <span className="font-mono font-bold text-red-600">₹{cropData.totalCost.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 text-sm border-t border-gray-50 pt-1">
                                              <span className="text-blue-600 font-medium">{t.expectedYield}:</span>
                                              <span className="font-mono font-bold text-blue-700">{cropData.expectedYield} {t.quintals}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Legend verticalAlign="top" height={36}/>
                                {profitViewMode === 'profit' ? (
                                  <>
                                    <Bar yAxisId="left" dataKey="estimatedProfit" name={t.estimatedProfit} fill="#16a34a" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="left" dataKey="totalCost" name={t.totalCost} fill="#ef4444" radius={[4, 4, 0, 0]} />
                                  </>
                                ) : (
                                  <Bar yAxisId="right" dataKey="expectedYield" name={t.expectedYield} fill="#2563eb" radius={[4, 4, 0, 0]} />
                                )}
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </Card>

                        <div className="grid grid-cols-1 gap-4">
                          {profitData
                            .filter(c => selectedProfitSeason === 'All' || c.season.includes(selectedProfitSeason))
                            .map((crop, idx) => (
                            <Card key={idx} className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-4">
                                <div className="bg-green-100 p-3 rounded-xl text-green-600 font-bold">
                                  #{idx + 1}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-lg">{crop.cropName}</h4>
                                    <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase">{crop.season}</span>
                                  </div>
                                  <p className="text-sm text-gray-500">{t.yieldPerAcre}: {crop.expectedYield} {t.quintals}/acre</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-green-600 font-bold text-lg">₹{crop.estimatedProfit.toLocaleString()}</div>
                                <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">{t.profitPerAcre}</div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeFeature === 'pesticide' && (
                <div>
                  <FeatureHeader title={t.pesticideGuide} onBack={() => setActiveFeature(null)} />
                  <div className="space-y-6">
                    <Card className="p-6">
                      <div className="flex flex-col gap-4">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t.selectCrop}</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="e.g. Tomato, Rice, Wheat"
                            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-red-500 outline-none transition-all"
                            value={selectedCrop}
                            onChange={(e) => setSelectedCrop(e.target.value)}
                          />
                          <Button 
                            onClick={() => fetchPesticideInfo(selectedCrop)}
                            disabled={!selectedCrop || isFetchingFeature}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {isFetchingFeature ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {pesticideInfo && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-l-4 border-red-500">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-red-100 p-2 rounded-lg text-red-600">
                              <ShieldAlert className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-red-900">{t.chemical}</h3>
                          </div>
                          <div className="space-y-4">
                            {pesticideInfo.chemical.map((item, idx) => (
                              <div key={idx} className="bg-red-50 p-4 rounded-2xl">
                                <div className="font-bold text-red-800 mb-1">{item.name}</div>
                                <div className="text-sm text-red-700/70 mb-2 font-medium">{t.usage}: {item.usage}</div>
                                <p className="text-xs text-red-600/60">{item.details}</p>
                              </div>
                            ))}
                          </div>
                        </Card>

                        <Card className="border-l-4 border-green-500">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-green-100 p-2 rounded-lg text-green-600">
                              <Leaf className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-green-900">{t.organic}</h3>
                          </div>
                          <div className="space-y-4">
                            {pesticideInfo.organic.map((item, idx) => (
                              <div key={idx} className="bg-green-50 p-4 rounded-2xl">
                                <div className="font-bold text-green-800 mb-1">{item.name}</div>
                                <div className="text-sm text-green-700/70 mb-2 font-medium">{t.usage}: {item.usage}</div>
                                <p className="text-xs text-green-600/60">{item.details}</p>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeFeature === 'seed' && (
                <div>
                  <FeatureHeader title={t.seedCalculator} onBack={() => setActiveFeature(null)} />
                  <div className="space-y-6">
                    <Card className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t.selectCrop}</label>
                          <input 
                            type="text"
                            placeholder="e.g. Maize"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-yellow-500 outline-none transition-all"
                            value={selectedCrop}
                            onChange={(e) => setSelectedCrop(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t.acres}</label>
                          <input 
                            type="number"
                            placeholder="e.g. 2.5"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-yellow-500 outline-none transition-all"
                            value={seedAcres}
                            onChange={(e) => setSeedAcres(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={calculateSeedQuantity}
                        disabled={!selectedCrop || !seedAcres || isFetchingFeature}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                        loading={isFetchingFeature}
                      >
                        {t.calculate}
                      </Button>
                    </Card>

                    {seedCalcResult && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className="bg-yellow-50 border-yellow-100 text-center py-10">
                          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Calculator className="w-10 h-10 text-yellow-600" />
                          </div>
                          <h3 className="text-lg font-bold text-yellow-800 mb-2">{t.seedQuantity}</h3>
                          <div className="text-4xl font-black text-yellow-900">{seedCalcResult}</div>
                        </Card>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {activeFeature === 'water' && (
                <div>
                  <FeatureHeader title={t.waterManagement} onBack={() => setActiveFeature(null)} />
                  <div className="space-y-6">
                    {!location ? (
                      <div className="text-center py-20">
                        <MapPin className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-500">{t.fetchFirst}</p>
                        <Button onClick={() => setActiveFeature('location')} variant="outline" className="mt-6">{t.setLocation}</Button>
                      </div>
                    ) : (
                      <>
                        <Card className="p-6">
                          <div className="flex flex-col gap-4">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t.selectCrop}</label>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="e.g. Sugarcane"
                                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-cyan-500 outline-none transition-all"
                                value={selectedCrop}
                                onChange={(e) => setSelectedCrop(e.target.value)}
                              />
                              <Button 
                                onClick={() => fetchWaterManagement(selectedCrop)}
                                disabled={!selectedCrop || isFetchingFeature}
                                className="bg-cyan-600 hover:bg-cyan-700"
                              >
                                {isFetchingFeature ? <Loader2 className="w-5 h-5 animate-spin" /> : <Droplet className="w-5 h-5" />}
                              </Button>
                            </div>
                          </div>
                        </Card>

                        {irrigationSchedule && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Card className="bg-cyan-600 text-white border-none">
                                <div className="flex items-center gap-3 mb-4">
                                  <Clock className="w-6 h-6 opacity-80" />
                                  <span className="font-bold uppercase tracking-widest text-xs opacity-80">{t.wateringTime}</span>
                                </div>
                                <div className="text-3xl font-black">{irrigationSchedule.bestTime}</div>
                              </Card>
                              <Card className="bg-blue-600 text-white border-none">
                                <div className="flex items-center gap-3 mb-4">
                                  <Calendar className="w-6 h-6 opacity-80" />
                                  <span className="font-bold uppercase tracking-widest text-xs opacity-80">{t.nextWatering}</span>
                                </div>
                                <div className="text-3xl font-black">{irrigationSchedule.nextWatering}</div>
                              </Card>
                            </div>

                            <Card>
                              <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                                <ListChecks className="w-6 h-6 text-cyan-600" />
                                {t.irrigationSchedule}
                              </h3>
                              <div className="space-y-4">
                                {irrigationSchedule.schedule.map((item, idx) => (
                                  <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="bg-cyan-100 p-2 rounded-lg text-cyan-600 font-bold text-sm">
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <div className="font-bold text-gray-900 mb-1">{item.stage}</div>
                                      <div className="text-sm text-cyan-600 font-bold mb-2">{item.frequency}</div>
                                      <p className="text-sm text-gray-500">{item.details}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </Card>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeFeature === 'schemes' && (
                <SchemesAndLoans 
                  language={language} 
                  onBack={() => setActiveFeature(null)} 
                />
              )}

              {activeFeature === 'logs' && (
                <div>
                  <FeatureHeader title={t.activityLogs} onBack={() => setActiveFeature(null)} />
                  <div className="space-y-4">
                    {filteredLogs.length > 0 ? filteredLogs.map((log, idx) => (
                      <Card key={idx} className="flex items-start gap-4">
                        <div className="bg-gray-100 p-2 rounded-lg mt-1">
                          <History className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">{log.activityType}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400">
                              {log.timestamp ? format((log.timestamp as any).toDate(), 'dd MMM yyyy, HH:mm') : 'Just now'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{log.activityDetails}</p>
                        </div>
                      </Card>
                    )) : (
                      <div className="text-center py-12 text-gray-500">{t.noLogs}</div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
