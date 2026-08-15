import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Loader2 } from 'lucide-react';
import { callGroq } from '../../services/ai';

// Top Indian cities for fast autocomplete
const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat',
  'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam',
  'Pimpri-Chinchwad', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad',
  'Meerut', 'Rajkot', 'Kalyan-Dombivali', 'Vasai-Virar', 'Varanasi', 'Srinagar', 'Aurangabad',
  'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur',
  'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Chandigarh', 'Guwahati',
  'Solapur', 'Hubballi-Dharwad', 'Tiruchirappalli', 'Bareilly', 'Mysore', 'Tiruppur', 'Gurgaon',
  'Aligarh', 'Jalandhar', 'Bhubaneswar', 'Salem', 'Mira-Bhayandar', 'Warangal', 'Thiruvananthapuram',
  'Guntur', 'Bhiwandi', 'Saharanpur', 'Gorakhpur', 'Bikaner', 'Amravati', 'Noida', 'Jamshedpur',
  'Bhilai', 'Cuttack', 'Firozabad', 'Kochi', 'Nellore', 'Bhavnagar', 'Dehradun', 'Durgapur',
  'Asansol', 'Rourkela', 'Nanded', 'Kolhapur', 'Ajmer', 'Akola', 'Gulbarga', 'Jamnagar',
  'Ujjain', 'Loni', 'Siliguri', 'Jhansi', 'Ulhasnagar', 'Jammu', 'Sangli-Miraj-Kupwad',
  'Mangalore', 'Erode', 'Belgaum', 'Ambattur', 'Tirunelveli', 'Malegaon', 'Gaya', 'Jalgaon',
  'Udaipur', 'Maheshtala', 'Davanagere', 'Kozhikode', 'Kurnool', 'Rajpur Sonarpur', 'Rajahmundry',
  'Bokaro', 'South Dumdum', 'Bellary', 'Patiala', 'Gopalpur', 'Agartala', 'Bhagalpur', 'Muzaffarnagar',
  'Bhatpara', 'Panihati', 'Latur', 'Dhule', 'Tirupati', 'Rohtak', 'Korba', 'Bhilwara', 'Berhampur',
  'Muzaffarpur', 'Ahmednagar', 'Mathura', 'Kollam', 'Avadi', 'Kadapa', 'Kamarhati', 'Sambalpur',
  'Bilaspur', 'Shahjahanpur', 'Satara', 'Bijapur', 'Rampur', 'Shivamogga', 'Chandrapur', 'Junagadh',
  'Thrissur', 'Alwar', 'Bardhaman', 'Kulti', 'Kakinada', 'Nizamabad', 'Parbhani', 'Tumkur',
  'Khammam', 'Ozhukarai', 'Bihar Sharif', 'Panipat', 'Darbhanga', 'Bally', 'Aizawl', 'Dewas'
];

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'e.g. Bengaluru, Mumbai, Delhi',
  disabled = false,
  className = ''
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Fast local filtering for instant feedback
  const getLocalSuggestions = useCallback((query: string): string[] => {
    if (!query.trim()) return [];
    const normalized = query.toLowerCase().trim();
    return INDIAN_CITIES
      .filter(city => city.toLowerCase().includes(normalized))
      .slice(0, 8); // Show top 8 matches
  }, []);

  // AI-powered suggestions for typos, partial names, regional variations
  const getAISuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) return;
    
    setIsLoadingAI(true);
    try {
      const systemPrompt = 'You are a location autocomplete system for India. Only return city names, one per line, no explanations.';
      const userPrompt = `Given the user input "${query}", suggest up to 5 relevant Indian city names. Include major cities and common regional spellings. If the input seems to be a typo or partial name, suggest the most likely matches.`;
      
      const response = await callGroq(systemPrompt, userPrompt, { temperature: 0.3, maxTokens: 100 });
      
      const cities = response
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line && !line.includes(':') && line.length > 2)
        .slice(0, 5);
      
      setAiSuggestions(cities);
    } catch (error) {
      console.error('AI suggestion error:', error);
      setAiSuggestions([]);
    } finally {
      setIsLoadingAI(false);
    }
  }, []);

  // Handle input changes with debounced AI suggestions
  useEffect(() => {
    const query = value.trim();
    
    // Instant local suggestions
    const local = getLocalSuggestions(query);
    setSuggestions(local);
    setShowSuggestions(query.length > 0);
    setSelectedIndex(-1);
    
    // Debounced AI suggestions (only if local results are insufficient or query is complex)
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    if (query.length >= 3 && local.length < 3) {
      debounceTimer.current = setTimeout(() => {
        getAISuggestions(query);
      }, 300); // 300ms debounce for near-realtime feel
    } else {
      setAiSuggestions([]);
      setIsLoadingAI(false);
    }
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [value, getLocalSuggestions, getAISuggestions]);

  // Combine local and AI suggestions, removing duplicates
  const allSuggestions = [...new Set([...suggestions, ...aiSuggestions])];

  const handleSelect = (city: string) => {
    onChange(city);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || allSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < allSuggestions.length) {
          handleSelect(allSuggestions[selectedIndex]);
        } else if (allSuggestions.length > 0) {
          handleSelect(allSuggestions[0]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" 
          size={18}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-none border border-[var(--ink)] bg-white px-10 py-3 font-[Inter] text-sm outline-none transition-all focus:border-black disabled:opacity-50"
          autoComplete="off"
        />
        {isLoadingAI && (
          <Loader2 
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--ink-soft)]" 
            size={16}
          />
        )}
      </div>

      <AnimatePresence>
        {showSuggestions && allSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full border border-[var(--ink)] bg-white shadow-lg"
          >
            {allSuggestions.map((city, index) => (
              <button
                key={`${city}-${index}`}
                type="button"
                onClick={() => handleSelect(city)}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-black text-white'
                    : 'hover:bg-gray-50'
                }`}
              >
                <MapPin size={14} className="flex-shrink-0" />
                <span className="truncate">{city}</span>
                {aiSuggestions.includes(city) && (
                  <span className="ml-auto text-xs opacity-50">AI</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
