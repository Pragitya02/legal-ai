import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { isLoggedIn, setStoredUser } from '../lib/auth'
import {
  Camera,
  Edit2,
  Save,
  MapPin,
  Mail,
  Phone,
  Award,
  ChevronDown,
  Check,
  Search,
  X,
} from 'lucide-react'
import { indiaDistricts } from '../data/indiaDistricts'
import { practiceAreas as PRACTICE_AREA_OPTIONS } from '../data/practiceAreas'


// =====================================================
// BACKEND URL
// =====================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'


// =====================================================
// PROFILE
// =====================================================

const COUNTRY_CODES = [
  { name: "Afghanistan", code: "+93" },
  { name: "Albania", code: "+355" },
  { name: "Algeria", code: "+213" },
  { name: "American Samoa", code: "+1" },
  { name: "Andorra", code: "+376" },
  { name: "Angola", code: "+244" },
  { name: "Anguilla", code: "+1" },
  { name: "Antarctica", code: "+672" },
  { name: "Antigua and Barbuda", code: "+1" },
  { name: "Argentina", code: "+54" },
  { name: "Armenia", code: "+374" },
  { name: "Aruba", code: "+297" },
  { name: "Australia", code: "+61" },
  { name: "Austria", code: "+43" },
  { name: "Azerbaijan", code: "+994" },
  { name: "Bahamas", code: "+1" },
  { name: "Bahrain", code: "+973" },
  { name: "Bangladesh", code: "+880" },
  { name: "Barbados", code: "+1" },
  { name: "Belarus", code: "+375" },
  { name: "Belgium", code: "+32" },
  { name: "Belize", code: "+501" },
  { name: "Benin", code: "+229" },
  { name: "Bermuda", code: "+1" },
  { name: "Bhutan", code: "+975" },
  { name: "Bolivia", code: "+591" },
  { name: "Bosnia and Herzegovina", code: "+387" },
  { name: "Botswana", code: "+267" },
  { name: "Brazil", code: "+55" },
  { name: "British Indian Ocean Territory", code: "+246" },
  { name: "British Virgin Islands", code: "+1" },
  { name: "Brunei", code: "+673" },
  { name: "Bulgaria", code: "+359" },
  { name: "Burkina Faso", code: "+226" },
  { name: "Burundi", code: "+257" },
  { name: "Cambodia", code: "+855" },
  { name: "Cameroon", code: "+237" },
  { name: "Canada", code: "+1" },
  { name: "Cape Verde", code: "+238" },
  { name: "Cayman Islands", code: "+1" },
  { name: "Central African Republic", code: "+236" },
  { name: "Chad", code: "+235" },
  { name: "Chile", code: "+56" },
  { name: "China", code: "+86" },
  { name: "Christmas Island", code: "+61" },
  { name: "Cocos (Keeling) Islands", code: "+61" },
  { name: "Colombia", code: "+57" },
  { name: "Comoros", code: "+269" },
  { name: "Congo", code: "+242" },
  { name: "Cook Islands", code: "+682" },
  { name: "Costa Rica", code: "+506" },
  { name: "C\u00f4te d'Ivoire", code: "+225" },
  { name: "Croatia", code: "+385" },
  { name: "Cuba", code: "+53" },
  { name: "Cura\u00e7ao", code: "+599" },
  { name: "Cyprus", code: "+357" },
  { name: "Czechia", code: "+420" },
  { name: "Democratic Republic of the Congo", code: "+243" },
  { name: "Denmark", code: "+45" },
  { name: "Djibouti", code: "+253" },
  { name: "Dominica", code: "+1" },
  { name: "Dominican Republic", code: "+1" },
  { name: "Ecuador", code: "+593" },
  { name: "Egypt", code: "+20" },
  { name: "El Salvador", code: "+503" },
  { name: "Equatorial Guinea", code: "+240" },
  { name: "Eritrea", code: "+291" },
  { name: "Estonia", code: "+372" },
  { name: "Eswatini", code: "+268" },
  { name: "Ethiopia", code: "+251" },
  { name: "Falkland Islands", code: "+500" },
  { name: "Faroe Islands", code: "+298" },
  { name: "Fiji", code: "+679" },
  { name: "Finland", code: "+358" },
  { name: "France", code: "+33" },
  { name: "French Guiana", code: "+594" },
  { name: "French Polynesia", code: "+689" },
  { name: "Gabon", code: "+241" },
  { name: "Gambia", code: "+220" },
  { name: "Georgia", code: "+995" },
  { name: "Germany", code: "+49" },
  { name: "Ghana", code: "+233" },
  { name: "Gibraltar", code: "+350" },
  { name: "Greece", code: "+30" },
  { name: "Greenland", code: "+299" },
  { name: "Grenada", code: "+1" },
  { name: "Guadeloupe", code: "+590" },
  { name: "Guam", code: "+1" },
  { name: "Guatemala", code: "+502" },
  { name: "Guernsey", code: "+44" },
  { name: "Guinea", code: "+224" },
  { name: "Guinea-Bissau", code: "+245" },
  { name: "Guyana", code: "+592" },
  { name: "Haiti", code: "+509" },
  { name: "Honduras", code: "+504" },
  { name: "Hong Kong", code: "+852" },
  { name: "Hungary", code: "+36" },
  { name: "Iceland", code: "+354" },
  { name: "India", code: "+91" },
  { name: "Indonesia", code: "+62" },
  { name: "Iran", code: "+98" },
  { name: "Iraq", code: "+964" },
  { name: "Ireland", code: "+353" },
  { name: "Isle of Man", code: "+44" },
  { name: "Israel", code: "+972" },
  { name: "Italy", code: "+39" },
  { name: "Jamaica", code: "+1" },
  { name: "Japan", code: "+81" },
  { name: "Jersey", code: "+44" },
  { name: "Jordan", code: "+962" },
  { name: "Kazakhstan", code: "+7" },
  { name: "Kenya", code: "+254" },
  { name: "Kiribati", code: "+686" },
  { name: "Kosovo", code: "+383" },
  { name: "Kuwait", code: "+965" },
  { name: "Kyrgyzstan", code: "+996" },
  { name: "Laos", code: "+856" },
  { name: "Latvia", code: "+371" },
  { name: "Lebanon", code: "+961" },
  { name: "Lesotho", code: "+266" },
  { name: "Liberia", code: "+231" },
  { name: "Libya", code: "+218" },
  { name: "Liechtenstein", code: "+423" },
  { name: "Lithuania", code: "+370" },
  { name: "Luxembourg", code: "+352" },
  { name: "Macau", code: "+853" },
  { name: "Madagascar", code: "+261" },
  { name: "Malawi", code: "+265" },
  { name: "Malaysia", code: "+60" },
  { name: "Maldives", code: "+960" },
  { name: "Mali", code: "+223" },
  { name: "Malta", code: "+356" },
  { name: "Marshall Islands", code: "+692" },
  { name: "Martinique", code: "+596" },
  { name: "Mauritania", code: "+222" },
  { name: "Mauritius", code: "+230" },
  { name: "Mayotte", code: "+262" },
  { name: "Mexico", code: "+52" },
  { name: "Micronesia", code: "+691" },
  { name: "Moldova", code: "+373" },
  { name: "Monaco", code: "+377" },
  { name: "Mongolia", code: "+976" },
  { name: "Montenegro", code: "+382" },
  { name: "Montserrat", code: "+1" },
  { name: "Morocco", code: "+212" },
  { name: "Mozambique", code: "+258" },
  { name: "Myanmar", code: "+95" },
  { name: "Namibia", code: "+264" },
  { name: "Nauru", code: "+674" },
  { name: "Nepal", code: "+977" },
  { name: "Netherlands", code: "+31" },
  { name: "New Caledonia", code: "+687" },
  { name: "New Zealand", code: "+64" },
  { name: "Nicaragua", code: "+505" },
  { name: "Niger", code: "+227" },
  { name: "Nigeria", code: "+234" },
  { name: "Niue", code: "+683" },
  { name: "Norfolk Island", code: "+672" },
  { name: "North Korea", code: "+850" },
  { name: "North Macedonia", code: "+389" },
  { name: "Northern Mariana Islands", code: "+1" },
  { name: "Norway", code: "+47" },
  { name: "Oman", code: "+968" },
  { name: "Pakistan", code: "+92" },
  { name: "Palau", code: "+680" },
  { name: "Palestine", code: "+970" },
  { name: "Panama", code: "+507" },
  { name: "Papua New Guinea", code: "+675" },
  { name: "Paraguay", code: "+595" },
  { name: "Peru", code: "+51" },
  { name: "Philippines", code: "+63" },
  { name: "Poland", code: "+48" },
  { name: "Portugal", code: "+351" },
  { name: "Puerto Rico", code: "+1" },
  { name: "Qatar", code: "+974" },
  { name: "R\u00e9union", code: "+262" },
  { name: "Romania", code: "+40" },
  { name: "Russia", code: "+7" },
  { name: "Rwanda", code: "+250" },
  { name: "Saint Barth\u00e9lemy", code: "+590" },
  { name: "Saint Helena", code: "+290" },
  { name: "Saint Kitts and Nevis", code: "+1" },
  { name: "Saint Lucia", code: "+1" },
  { name: "Saint Martin", code: "+590" },
  { name: "Saint Pierre and Miquelon", code: "+508" },
  { name: "Saint Vincent and the Grenadines", code: "+1" },
  { name: "Samoa", code: "+685" },
  { name: "San Marino", code: "+378" },
  { name: "S\u00e3o Tom\u00e9 and Pr\u00edncipe", code: "+239" },
  { name: "Saudi Arabia", code: "+966" },
  { name: "Senegal", code: "+221" },
  { name: "Serbia", code: "+381" },
  { name: "Seychelles", code: "+248" },
  { name: "Sierra Leone", code: "+232" },
  { name: "Singapore", code: "+65" },
  { name: "Sint Maarten", code: "+1" },
  { name: "Slovakia", code: "+421" },
  { name: "Slovenia", code: "+386" },
  { name: "Solomon Islands", code: "+677" },
  { name: "Somalia", code: "+252" },
  { name: "South Africa", code: "+27" },
  { name: "South Korea", code: "+82" },
  { name: "South Sudan", code: "+211" },
  { name: "Spain", code: "+34" },
  { name: "Sri Lanka", code: "+94" },
  { name: "Sudan", code: "+249" },
  { name: "Suriname", code: "+597" },
  { name: "Svalbard and Jan Mayen", code: "+47" },
  { name: "Sweden", code: "+46" },
  { name: "Switzerland", code: "+41" },
  { name: "Syria", code: "+963" },
  { name: "Taiwan", code: "+886" },
  { name: "Tajikistan", code: "+992" },
  { name: "Tanzania", code: "+255" },
  { name: "Thailand", code: "+66" },
  { name: "Timor-Leste", code: "+670" },
  { name: "Togo", code: "+228" },
  { name: "Tokelau", code: "+690" },
  { name: "Tonga", code: "+676" },
  { name: "Trinidad and Tobago", code: "+1" },
  { name: "Tunisia", code: "+216" },
  { name: "T\u00fcrkiye", code: "+90" },
  { name: "Turkmenistan", code: "+993" },
  { name: "Turks and Caicos Islands", code: "+1" },
  { name: "Tuvalu", code: "+688" },
  { name: "U.S. Virgin Islands", code: "+1" },
  { name: "Uganda", code: "+256" },
  { name: "Ukraine", code: "+380" },
  { name: "United Arab Emirates", code: "+971" },
  { name: "United Kingdom", code: "+44" },
  { name: "United States", code: "+1" },
  { name: "Uruguay", code: "+598" },
  { name: "Uzbekistan", code: "+998" },
  { name: "Vanuatu", code: "+678" },
  { name: "Vatican City", code: "+39" },
  { name: "Venezuela", code: "+58" },
  { name: "Vietnam", code: "+84" },
  { name: "Wallis and Futuna", code: "+681" },
  { name: "Western Sahara", code: "+212" },
  { name: "Yemen", code: "+967" },
  { name: "Zambia", code: "+260" },
  { name: "Zimbabwe", code: "+263" }
] as const

const CONSTITUTIONAL_COURTS = [
  'Supreme Court of India',
  'Allahabad High Court',
  'Andhra Pradesh High Court',
  'Bombay High Court',
  'Calcutta High Court',
  'Chhattisgarh High Court',
  'Delhi High Court',
  'Gauhati High Court',
  'Gujarat High Court',
  'Himachal Pradesh High Court',
  'High Court of Jammu & Kashmir and Ladakh',
  'Jharkhand High Court',
  'Karnataka High Court',
  'Kerala High Court',
  'Madhya Pradesh High Court',
  'Madras High Court',
  'Manipur High Court',
  'Meghalaya High Court',
  'Orissa High Court',
  'Patna High Court',
  'Punjab and Haryana High Court',
  'Rajasthan High Court',
  'Sikkim High Court',
  'Telangana High Court',
  'Tripura High Court',
  'Uttarakhand High Court',
] as const

/*
 * District-level court coverage.
 *
 * The project already contains the India district directory used by the
 * Citizen Portal. Each district is exposed as a searchable District &
 * Sessions Court option.
 *
 * This keeps the selector complete at the district-court level while the
 * constitutional courts remain separately listed above.
 */
const DISTRICT_COURT_OPTIONS = indiaDistricts.map(
  (district) => `District & Sessions Court — ${district}`
)

const COURT_OPTIONS = [
  ...CONSTITUTIONAL_COURTS,
  ...DISTRICT_COURT_OPTIONS,
]

const normalizeSelectorText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')


function SearchableSingleSelect({
  label,
  value,
  options,
  open,
  setOpen,
  search,
  setSearch,
  onChange,
  placeholder,
  inputIcon,
}: {
  label: string
  value: string
  options: readonly string[]
  open: boolean
  setOpen: (value: boolean) => void
  search: string
  setSearch: (value: string) => void
  onChange: (value: string) => void
  placeholder: string
  inputIcon?: ReactNode
}) {
  const filtered = options.filter((option) =>
    normalizeSelectorText(option).includes(
      normalizeSelectorText(search)
    )
  )

  return (
    <div style={{ position: 'relative' }}>
      {label && (
        <label
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            display: 'block',
            marginBottom: 6,
          }}
        >
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          minHeight: 42,
          padding: '9px 12px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          color: value ? 'var(--text)' : 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '0.85rem',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {inputIcon}
          {value || placeholder}
        </span>

        <ChevronDown
          size={16}
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 6,
            maxHeight: 310,
            overflowY: 'auto',
            padding: 7,
            borderRadius: 10,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            zIndex: 100,
          }}
        >
          <div style={{ position: 'relative', marginBottom: 7 }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />

            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="input"
              style={{
                width: '100%',
                paddingLeft: 30,
                paddingRight: search ? 30 : 10,
                boxSizing: 'border-box',
              }}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 7,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 24,
                  height: 24,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {filtered.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option)
                setSearch('')
                setOpen(false)
              }}
              style={{
                width: '100%',
                padding: '9px 10px',
                border: 'none',
                borderRadius: 7,
                background:
                  value === option
                    ? 'var(--bg-secondary)'
                    : 'transparent',
                color:
                  value === option
                    ? '#D4AF37'
                    : 'var(--text)',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {option}
            </button>
          ))}

          {filtered.length === 0 && (
            <div
              style={{
                padding: 14,
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.78rem',
              }}
            >
              No {label.toLowerCase()} found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Profile() {

  const location = useLocation()

  const isAdvocate =
    location.pathname.startsWith('/advocate')


  // ===================================================
  // STATE
  // ===================================================

  const [editing, setEditing] =
    useState(false)

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)


  const [name, setName] =
    useState('')

  const [email, setEmail] =
    useState('')

  const [phoneNumber, setPhoneNumber] =
    useState('')

  const [phoneCountryCode, setPhoneCountryCode] =
    useState('+91')

  const [city, setCity] =
    useState('')

  const [bio, setBio] =
    useState('')

  const [barCouncilNo, setBarCouncilNo] = useState('')
  const [practiceAreas, setPracticeAreas] = useState<string[]>([])
  const [highCourt, setHighCourt] = useState('')
  const [enrollmentYear, setEnrollmentYear] = useState('')
  const [practiceDropdownOpen, setPracticeDropdownOpen] = useState(false)
  const [practiceSearch, setPracticeSearch] = useState('')

  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false)
  const [districtSearch, setDistrictSearch] = useState('')

  const [courtDropdownOpen, setCourtDropdownOpen] = useState(false)
  const [courtSearch, setCourtSearch] = useState('')

  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')

  const practiceDropdownRef = useRef<HTMLDivElement | null>(null)
  const districtDropdownRef = useRef<HTMLDivElement | null>(null)
  const courtDropdownRef = useRef<HTMLDivElement | null>(null)
  const countryDropdownRef = useRef<HTMLDivElement | null>(null)

  const [userData, setUserDataState] = useState<any>({})


  // ===================================================
  // LOAD USER
  // ===================================================

  useEffect(() => {

    loadProfile()

  }, [])

  // Close any searchable selector when clicking outside it.
  useEffect(() => {
    if (
      !practiceDropdownOpen &&
      !districtDropdownOpen &&
      !courtDropdownOpen &&
      !countryDropdownOpen
    ) {
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null

      if (
        practiceDropdownRef.current &&
        target &&
        !practiceDropdownRef.current.contains(target)
      ) {
        setPracticeDropdownOpen(false)
      }

      if (
        districtDropdownRef.current &&
        target &&
        !districtDropdownRef.current.contains(target)
      ) {
        setDistrictDropdownOpen(false)
      }

      if (
        courtDropdownRef.current &&
        target &&
        !courtDropdownRef.current.contains(target)
      ) {
        setCourtDropdownOpen(false)
      }

      if (
        countryDropdownRef.current &&
        target &&
        !countryDropdownRef.current.contains(target)
      ) {
        setCountryDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      )
    }
  }, [
    practiceDropdownOpen,
    districtDropdownOpen,
    courtDropdownOpen,
    countryDropdownOpen,
  ])



  // ===================================================
  // LOAD PROFILE FROM BACKEND
  // ===================================================

  const loadProfile = async () => {

    try {

      // -----------------------------------------------
      // IF THERE IS NO USER SESSION
      // -----------------------------------------------

      if (!isLoggedIn()) {

        console.warn(
          'No login session found'
        )

        loadFromLocalStorage()

        setLoading(false)

        return
      }


      // -----------------------------------------------
      // GET PROFILE FROM DATABASE
      // -----------------------------------------------

      const response =
        await fetch(
          `${API_URL}/api/profile`,
          {
            method: 'GET',
            credentials: 'include',

            headers: {
              'Content-Type':
                'application/json',
            },
          }
        )


      const data =
        await response.json()


      console.log(
        'PROFILE RESPONSE:',
        data
      )


      if (
        response.ok &&
        data.success &&
        data.user
      ) {

        setUserData(
          data.user
        )


        // ---------------------------------------------
        // KEEP LOCAL STORAGE UPDATED
        // ---------------------------------------------

        setStoredUser(data.user)

      } else {

        console.warn(
          'Could not load profile from server:',
          data.message
        )

        loadFromLocalStorage()

      }

    } catch (error) {

      console.error(
        'LOAD PROFILE ERROR:',
        error
      )

      // ---------------------------------------------
      // FALLBACK
      // ---------------------------------------------

      loadFromLocalStorage()

    } finally {

      setLoading(false)

    }

  }


  // ===================================================
  // LOAD FROM LOCAL STORAGE
  // ===================================================

  const loadFromLocalStorage = () => {

    try {

      const storedUser =
        localStorage.getItem('user')


      if (
        !storedUser ||
        storedUser === 'undefined' ||
        storedUser === 'null'
      ) {

        setName(
          isAdvocate
            ? 'Advocate'
            : 'Citizen'
        )

        setEmail('')

        setPhoneNumber('')
        setPhoneCountryCode('+91')

        setCity('')

        return

      }


      const user =
        JSON.parse(storedUser)


      setUserData(user)

    } catch (error) {

      console.error(
        'LOCAL STORAGE ERROR:',
        error
      )

    }

  }


  // ===================================================
  // SET USER DATA
  // ===================================================

  const setUserData = (
    user: any
  ) => {

    setUserDataState(user || {})

    const fullName =
      user?.fullName ||
      user?.full_name ||
      user?.name ||
      user?.advocateName ||
      user?.displayName ||
      user?.username ||
      ''


    const userEmail =
      user?.email || ''


    const userPhone =
      user?.phone ||
      user?.phoneNumber ||
      user?.mobile ||
      ''


    const userCity =
      user?.city ||
      user?.location ||
      ''


    // -----------------------------------------------
    // REMOVE "Adv." FROM NAME
    // -----------------------------------------------

    const cleanName =
      String(fullName)
        .replace(
          /^Adv\.\s*/i,
          ''
        )
        .trim()


    setName(
      cleanName
    )

    setEmail(
      userEmail
    )

    const rawPhone = String(userPhone || '').trim()

    const matchedCountry = COUNTRY_CODES
      .slice()
      .sort((a, b) => b.code.length - a.code.length)
      .find((country) =>
        rawPhone.startsWith(country.code)
      )

    if (matchedCountry) {
      setPhoneCountryCode(matchedCountry.code)
      setPhoneNumber(
        rawPhone
          .slice(matchedCountry.code.length)
          .replace(/^\s+/, '')
      )
    } else {
      setPhoneCountryCode('+91')
      setPhoneNumber(rawPhone)
    }

    setCity(
      userCity
    )


    // -----------------------------------------------
    // BIO
    // -----------------------------------------------

    setBio(user?.bio || '')

    setBarCouncilNo(
      user?.barCouncilNo ||
      user?.bar_council_no ||
      ''
    )

    const storedPracticeAreas =
      user?.practiceAreas ||
      user?.practice_areas ||
      user?.specialization ||
      ''

    if (Array.isArray(storedPracticeAreas)) {
      setPracticeAreas(storedPracticeAreas.filter(Boolean))
    } else if (storedPracticeAreas) {
      setPracticeAreas(
        String(storedPracticeAreas)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      )
    } else {
      setPracticeAreas([])
    }

    setHighCourt(
      user?.highCourt ||
      user?.high_court ||
      ''
    )

    setEnrollmentYear(
      user?.enrollmentYear != null
        ? String(user.enrollmentYear)
        : user?.enrollment_year != null
          ? String(user.enrollment_year)
          : ''
    )

  }


  // ===================================================
  // SAVE PROFILE
  // ===================================================

  const handleSaveProfile = async () => {

    // -----------------------------------------------
    // CHECK LOGIN
    // -----------------------------------------------

    if (!isLoggedIn()) {

      alert(
        'Your login session has expired. Please login again.'
      )

      return

    }


    // -----------------------------------------------
    // VALIDATION
    // -----------------------------------------------

    if (!name.trim()) {

      alert(
        'Please enter your full name.'
      )

      return

    }


    if (!email.trim()) {

      alert(
        'Please enter your email.'
      )

      return

    }


    setSaving(true)


    try {

      console.log(
        'Saving profile...'
      )


      // -----------------------------------------------
      // SEND TO BACKEND
      // -----------------------------------------------

      const response =
        await fetch(
          `${API_URL}/api/profile`,
          {
            method: 'PUT',
            credentials: 'include',

            headers: {

              'Content-Type':
                'application/json',

            },

            body:
              JSON.stringify({
                fullName: name.trim(),
                email: email.trim(),
                phone: `${phoneCountryCode} ${phoneNumber.trim()}`.trim(),
                city: city.trim(),
                bio: bio.trim(),
                ...(isAdvocate
                  ? {
                      barCouncilNo: barCouncilNo.trim(),
                      practiceAreas,
                      highCourt: highCourt.trim(),
                      enrollmentYear: enrollmentYear.trim(),
                    }
                  : {}),
              })

            }

          )



      const data =
        await response.json()


      console.log(
        'UPDATE PROFILE RESPONSE:',
        data
      )


      // -----------------------------------------------
      // ERROR
      // -----------------------------------------------

      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.message ||
          'Failed to update profile'
        )

      }


      // -----------------------------------------------
      // UPDATED USER
      // -----------------------------------------------

      const updatedUser =
        data.user


      if (!updatedUser) {

        throw new Error(
          'Server did not return updated user information'
        )

      }


      // -----------------------------------------------
      // SAVE TO LOCAL STORAGE
      // -----------------------------------------------

      setStoredUser(updatedUser)


      // -----------------------------------------------
      // UPDATE SCREEN
      // -----------------------------------------------

      setUserData(
        updatedUser
      )


      // -----------------------------------------------
      // EXIT EDIT MODE
      // -----------------------------------------------

      setPracticeDropdownOpen(false)
      setDistrictDropdownOpen(false)
      setCourtDropdownOpen(false)
      setCountryDropdownOpen(false)
      setPracticeSearch('')
      setDistrictSearch('')
      setCourtSearch('')
      setCountrySearch('')
      setEditing(false)


      alert(
        'Profile updated successfully!'
      )


    } catch (error) {

      console.error(
        'SAVE PROFILE ERROR:',
        error
      )


      alert(
        error instanceof Error
          ? error.message
          : 'Failed to update profile'
      )

    } finally {

      setSaving(false)

    }

  }


  // ===================================================
  // PRACTICE AREA SELECTION
  // ===================================================

  const togglePracticeArea = (area: string) => {
    setPracticeAreas((previous) =>
      previous.includes(area)
        ? previous.filter((item) => item !== area)
        : [...previous, area]
    )
  }


  // ===================================================
  // CANCEL EDIT
  // ===================================================

  const handleEditButton = () => {

    if (editing) {

      // ---------------------------------------------
      // CANCEL
      // ---------------------------------------------

      loadProfile()

      setPracticeDropdownOpen(false)
      setDistrictDropdownOpen(false)
      setCourtDropdownOpen(false)
      setCountryDropdownOpen(false)

      setPracticeSearch('')
      setDistrictSearch('')
      setCourtSearch('')
      setCountrySearch('')

      setEditing(false)

    } else {

      // ---------------------------------------------
      // START EDITING
      // ---------------------------------------------

      setEditing(true)

    }

  }


  // ===================================================
  // INITIALS
  // ===================================================

  const getInitials = (
    userName: string
  ) => {

    const words =
      userName
        .split(/\s+/)
        .filter(Boolean)


    if (
      words.length >= 2
    ) {

      return (
        words[0].charAt(0) +
        words[1].charAt(0)
      ).toUpperCase()

    }


    return userName
      .slice(0, 2)
      .toUpperCase()

  }


  const userInitials =
    getInitials(
      name || (
        isAdvocate
          ? 'Advocate'
          : 'Citizen'
      )
    )

  // ---------------------------------------------------
  // DATA-DRIVEN ADVOCATE STATS
  // ---------------------------------------------------
  const currentYear = new Date().getFullYear()

  const parsedEnrollmentYear = Number(enrollmentYear)

  const hasValidEnrollmentYear =
    Number.isInteger(parsedEnrollmentYear) &&
    parsedEnrollmentYear >= 1900 &&
    parsedEnrollmentYear <= currentYear

  const experienceYears = hasValidEnrollmentYear
    ? Math.max(0, currentYear - parsedEnrollmentYear)
    : null

  const ratingValue =
    Number(userData?.rating) > 0
      ? Number(userData.rating).toFixed(1)
      : null

  const reviewCount =
    Number(userData?.reviewCount ?? userData?.reviews) > 0
      ? Number(userData.reviewCount ?? userData.reviews)
      : 0

  const totalCases =
    Number(userData?.totalCases ?? userData?.cases) > 0
      ? Number(userData.totalCases ?? userData.cases)
      : 0

  const selectedCourt =
    highCourt.trim() || 'Not specified'


  // ===================================================
  // DOCUMENTS
  // ===================================================

  // Documents will be populated when real document data is connected.
  const documents: any[] = []

  // ===================================================
  // APPOINTMENTS
  // ===================================================

  // Appointments will be populated from real booking data when connected.
  const appointments: any[] = []

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {

    return (

      <div
        className="page-enter"
        style={{
          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',

          minHeight:
            '400px',

          color:
            'var(--text-muted)',

          fontSize:
            '0.9rem',
        }}
      >

        Loading profile...

      </div>

    )

  }


  // ===================================================
  // UI
  // ===================================================

  return (

    <div
      className="page-enter"
      style={{
        display:
          'flex',

        flexDirection:
          'column',

        gap:
          24,

        maxWidth:
          860,
      }}
    >


      {/* =================================================
          PROFILE HEADER
          ================================================= */}

      <div
        className="card"
        style={{
          padding:
            28
        }}
      >

        <div
          style={{
            display:
              'flex',

            gap:
              24,

            alignItems:
              'flex-start',

            flexWrap:
              'wrap',
          }}
        >


          {/* =============================================
              AVATAR
              ============================================= */}

          <div
            style={{
              position:
                'relative',
            }}
          >

            <div
              className="avatar"
              style={{
                width:
                  88,

                height:
                  88,

                fontSize:
                  '1.8rem',

                background:
                  isAdvocate
                    ? 'linear-gradient(135deg, var(--emerald), #065F46)'
                    : 'linear-gradient(135deg, var(--blue), #7C3AED)',
              }}
            >

              {userInitials}

            </div>


            <button
              type="button"
              style={{
                position:
                  'absolute',

                bottom:
                  0,

                right:
                  0,

                width:
                  28,

                height:
                  28,

                borderRadius:
                  '50%',

                border:
                  '2px solid var(--bg-card)',

                background:
                  'var(--blue)',

                cursor:
                  'pointer',

                display:
                  'flex',

                alignItems:
                  'center',

                justifyContent:
                  'center',
              }}
            >

              <Camera
                size={13}
                color="white"
              />

            </button>

          </div>


          {/* =============================================
              USER INFORMATION
              ============================================= */}

          <div
            style={{
              flex:
                1,

              minWidth:
                200,
            }}
          >

            <div
              style={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  12,

                marginBottom:
                  4,

                flexWrap:
                  'wrap',
              }}
            >

              <h1
                style={{
                  fontSize:
                    '1.4rem',

                  fontWeight:
                    800,

                  color:
                    'var(--text)',

                  letterSpacing:
                    '-0.02em',
                }}
              >

                {isAdvocate
                  ? `Adv. ${name}`
                  : name}

              </h1>


              {isAdvocate && (

                <span
                  style={{
                    display:
                      'inline-flex',

                    alignItems:
                      'center',

                    gap:
                      4,

                    padding:
                      '4px 10px',

                    borderRadius:
                      99,

                    fontSize:
                      '0.7rem',

                    fontWeight:
                      700,

                    background:
                      'var(--emerald-subtle)',

                    color:
                      'var(--emerald)',

                    border:
                      '1px solid var(--emerald-light)',
                  }}
                >

                  <Award
                    size={11}
                  />

                  Verified Advocate

                </span>

              )}

            </div>


            {/* CONTACT INFORMATION */}

            <div
              style={{
                display:
                  'flex',

                gap:
                  16,

                flexWrap:
                  'wrap',
              }}
            >

              {(
                [
                  [Mail, email],
                  [Phone, phoneNumber ? `${phoneCountryCode} ${phoneNumber}` : 'Not provided'],
                  [MapPin, city],
                ] as [
                  typeof Mail,
                  string
                ][]
              ).map(
                ([Icon, val], i) => (

                  <div
                    key={i}
                    style={{
                      display:
                        'flex',

                      alignItems:
                        'center',

                      gap:
                        5,

                      fontSize:
                        '0.82rem',

                      color:
                        'var(--text-muted)',
                    }}
                  >

                    <Icon
                      size={13}
                      style={{
                        color:
                          'var(--text-subtle)',

                        flexShrink:
                          0,
                      }}
                    />

                    {val ||
                      'Not provided'}

                  </div>

                )
              )}

            </div>


            {/* ADVOCATE STATS */}

            {isAdvocate && (

              <div
                style={{
                  display:
                    'flex',

                  gap:
                    16,

                  marginTop:
                    12,

                  flexWrap:
                    'wrap',
                }}
              >

                {[
                  [
                    ratingValue
                      ? `${ratingValue} ⭐`
                      : 'New user',
                    ratingValue
                      ? `${reviewCount} reviews`
                      : 'No ratings yet'
                  ],

                  [
                    experienceYears !== null
                      ? `${experienceYears}yr`
                      : 'Not specified',
                    'experience'
                  ],

                  [
                    String(totalCases),
                    'cases'
                  ],

                  [
                    selectedCourt,
                    'court'
                  ],

                ].map(
                  ([v, l]) => (

                    <div
                      key={l}
                    >

                      <span
                        style={{
                          fontWeight:
                            700,

                          color:
                            'var(--text)',

                          fontSize:
                            '0.9rem',
                        }}
                      >

                        {v}

                      </span>

                      <span
                        style={{
                          color:
                            'var(--text-muted)',

                          fontSize:
                            '0.75rem',

                          marginLeft:
                            4,
                        }}
                      >

                        {l}

                      </span>

                    </div>

                  )
                )}

              </div>

            )}

          </div>


          {/* =============================================
              EDIT / SAVE BUTTON
              ============================================= */}

          <button
            type="button"
            onClick={() => {

              if (editing) {

                handleSaveProfile()

              } else {

                handleEditButton()

              }

            }}
            disabled={
              saving
            }
            className={
              editing
                ? 'btn-emerald'
                : 'btn-ghost'
            }
            style={{
              padding:
                '9px 18px',

              borderRadius:
                9,

              fontSize:
                '0.85rem',

              fontWeight:
                600,

              cursor:
                saving
                  ? 'not-allowed'
                  : 'pointer',

              border:
                editing
                  ? 'none'
                  : '1px solid var(--border)',

              display:
                'flex',

              alignItems:
                'center',

              gap:
                6,

              opacity:
                saving
                  ? 0.7
                  : 1,
            }}
          >

            {editing ? (

              <>

                <Save
                  size={14}
                />

                {saving
                  ? 'Saving...'
                  : 'Save Changes'}

              </>

            ) : (

              <>

                <Edit2
                  size={14}
                />

                Edit Profile

              </>

            )}

          </button>

        </div>

      </div>


      {/* =================================================
          PERSONAL INFORMATION
          ================================================= */}

      <div
        className="card"
        style={{
          padding:
            24
        }}
      >

        <h2
          style={{
            fontWeight:
              700,

            color:
              'var(--text)',

            fontSize:
              '0.95rem',

            marginBottom:
              20,
          }}
        >

          Personal Information

        </h2>


        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
          className="form-grid"
        >
          {/* FULL NAME */}
          <div>
            <label
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Full Name
            </label>

            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={!editing}
            />
          </div>

          {/* EMAIL */}
          <div>
            <label
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Email Address
            </label>

            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={!editing}
            />
          </div>

          {/* PHONE */}
          <div>
            <label
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Phone Number
            </label>

            {editing ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(145px, 0.9fr) 1.1fr',
                  gap: 8,
                }}
              >
                <div
                  ref={countryDropdownRef}
                  style={{ position: 'relative' }}
                >
                  <SearchableSingleSelect
                    label=""
                    value={
                    COUNTRY_CODES.find(
                      (country) =>
                        country.code === phoneCountryCode
                    )?.name
                      ? `${COUNTRY_CODES.find(
                          (country) =>
                            country.code === phoneCountryCode
                        )?.name} (${phoneCountryCode})`
                      : phoneCountryCode
                  }
                  options={COUNTRY_CODES.map(
                    (country) =>
                      `${country.name} (${country.code})`
                  )}
                  open={countryDropdownOpen}
                  setOpen={setCountryDropdownOpen}
                  search={countrySearch}
                  setSearch={setCountrySearch}
                  onChange={(selected) => {
                    const match =
                      COUNTRY_CODES.find(
                        (country) =>
                          `${country.name} (${country.code})` ===
                          selected
                      )

                    if (match) {
                      setPhoneCountryCode(match.code)
                    }
                  }}
                    placeholder="Country"
                  />
                </div>

                <input
                  type="tel"
                  inputMode="tel"
                  className="input"
                  value={phoneNumber}
                  onChange={(e) =>
                    setPhoneNumber(
                      e.target.value.replace(
                        /[^\d\s().-]/g,
                        ''
                      )
                    )
                  }
                  placeholder="Mobile number"
                />
              </div>
            ) : (
              <input
                type="text"
                className="input"
                value={
                  phoneNumber
                    ? `${phoneCountryCode} ${phoneNumber}`
                    : 'Not provided'
                }
                readOnly
              />
            )}
          </div>

          {/* DISTRICT FOR ADVOCATES / CITY FOR CITIZENS */}
          <div>
            {isAdvocate && editing ? (
              <SearchableSingleSelect
                label="District"
                value={city}
                options={indiaDistricts}
                open={districtDropdownOpen}
                setOpen={setDistrictDropdownOpen}
                search={districtSearch}
                setSearch={setDistrictSearch}
                onChange={setCity}
                placeholder="Select your district"
                inputIcon={<MapPin size={14} />}
              />
            ) : (
              <>
                <label
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  {isAdvocate ? 'District' : 'City / Location'}
                </label>

                <input
                  type="text"
                  className="input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  readOnly={!editing}
                />
              </>
            )}
          </div>
        </div>

        {/* BIO */}

        <div
          style={{
            marginTop:
              16,
          }}
        >

          <label
            style={{
              fontSize:
                '0.78rem',

              fontWeight:
                600,

              color:
                'var(--text-muted)',

              display:
                'block',

              marginBottom:
                6,
            }}
          >

            Bio / About

          </label>


          <textarea
            className="input"

            rows={3}

            value={
              bio
            }

            onChange={
              (e) =>
                setBio(
                  e.target.value
                )
            }

            readOnly={
              !editing
            }

            style={{
              resize:
                editing
                  ? 'vertical'
                  : 'none',
            }}
          />

        </div>


        {/* ADVOCATE INFORMATION */}

        {isAdvocate && (
          <div
            style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
            className="form-grid"
          >
            <div>
              <label
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Bar Council No.
              </label>

              <input
                type="text"
                className="input"
                value={barCouncilNo}
                onChange={(e) => setBarCouncilNo(e.target.value)}
                readOnly={!editing}
                placeholder="Enter Bar Council number"
              />
            </div>

            <div ref={practiceDropdownRef} style={{ position: 'relative' }}>
              <label
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Practice Area
              </label>

              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPracticeDropdownOpen(
                        (open) => !open
                      )
                    }
                    style={{
                      width: '100%',
                      minHeight: 42,
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      color: practiceAreas.length
                        ? 'var(--text)'
                        : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {practiceAreas.length
                        ? practiceAreas.join(', ')
                        : 'Select practice areas'}
                    </span>

                    <ChevronDown
                      size={16}
                      style={{
                        flexShrink: 0,
                        transform: practiceDropdownOpen
                          ? 'rotate(180deg)'
                          : 'none',
                      }}
                    />
                  </button>

                  {practiceDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 6,
                        maxHeight: 310,
                        overflowY: 'auto',
                        padding: 7,
                        borderRadius: 10,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
                        zIndex: 100,
                      }}
                    >
                      <div style={{ position: 'relative', marginBottom: 7 }}>
                        <Search
                          size={14}
                          style={{
                            position: 'absolute',
                            left: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)',
                          }}
                        />
                        <input
                          autoFocus
                          type="text"
                          value={practiceSearch}
                          onChange={(e) =>
                            setPracticeSearch(e.target.value)
                          }
                          placeholder="Search practice areas..."
                          className="input"
                          style={{
                            width: '100%',
                            paddingLeft: 30,
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      {PRACTICE_AREA_OPTIONS
                        .filter((area) =>
                          normalizeSelectorText(area).includes(
                            normalizeSelectorText(practiceSearch)
                          )
                        )
                        .map((area) => {
                          const selected =
                            practiceAreas.includes(area)

                          return (
                            <button
                              key={area}
                              type="button"
                              onClick={() =>
                                togglePracticeArea(area)
                              }
                              style={{
                                width: '100%',
                                border: 'none',
                                background: selected
                                  ? 'var(--bg-secondary)'
                                  : 'transparent',
                                color: 'var(--text)',
                                padding: '9px 10px',
                                borderRadius: 7,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 9,
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.8rem',
                              }}
                            >
                              <span
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 5,
                                  border: '1px solid var(--border)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  background: selected
                                    ? '#D4AF37'
                                    : 'transparent',
                                }}
                              >
                                {selected && (
                                  <Check
                                    size={12}
                                    color="#111"
                                    strokeWidth={3}
                                  />
                                )}
                              </span>

                              <span>{area}</span>
                            </button>
                          )
                        })}

                      <div
                        style={{
                          borderTop: '1px solid var(--border)',
                          marginTop: 4,
                          padding: '8px 8px 4px',
                          fontSize: '0.7rem',
                          color: 'var(--text-subtle)',
                        }}
                      >
                        Select one or more practice areas.
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <input
                  type="text"
                  className="input"
                  value={
                    practiceAreas.length
                      ? practiceAreas.join(', ')
                      : 'Not specified'
                  }
                  readOnly
                />
              )}
            </div>
            <div ref={courtDropdownRef} style={{ position: 'relative' }}>
              {editing ? (
                <SearchableSingleSelect
                  label="Your Court"
                  value={highCourt}
                  options={COURT_OPTIONS}
                  open={courtDropdownOpen}
                  setOpen={setCourtDropdownOpen}
                  search={courtSearch}
                  setSearch={setCourtSearch}
                  onChange={setHighCourt}
                  placeholder="Select your court"
                />
              ) : (
                <>
                  <label
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      display: 'block',
                      marginBottom: 6,
                    }}
                  >
                    Your Court
                  </label>

                  <input
                    type="text"
                    className="input"
                    value={highCourt || 'Not specified'}
                    readOnly
                  />
                </>
              )}
            </div>


            <div>
              <label
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Enrollment Year
              </label>

              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                className="input"
                value={enrollmentYear}
                onChange={(e) => setEnrollmentYear(e.target.value)}
                readOnly={!editing}
                placeholder="e.g. 2009"
              />
            </div>
          </div>
        )}

        </div>


      {/* =================================================
          DOCUMENTS
          ================================================= */}

      <div
        className="card"
        style={{
          padding:
            24
        }}
      >

        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            marginBottom:
              18,
          }}
        >

          <h2
            style={{
              fontWeight:
                700,

              color:
                'var(--text)',

              fontSize:
                '0.95rem',
            }}
          >

            {isAdvocate
              ? 'Credentials & Documents'
              : 'Uploaded Documents'}

          </h2>


          <button
            type="button"
            className="btn-primary"
            style={{
              padding:
                '7px 14px',

              borderRadius:
                8,

              fontSize:
                '0.78rem',

              fontWeight:
                600,

              border:
                'none',

              cursor:
                'pointer',
            }}
          >

            Upload +

          </button>

        </div>


        <div
          style={{
            display:
              'flex',

            flexDirection:
              'column',

            gap:
              10,
          }}
        >

          {documents.length ? (
            documents.map(
              (d, i) => (
                <div key={i}>
                  {d.name}
                </div>
              )
            )
          ) : (
            <div
              style={{
                padding: '18px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                border: '1px dashed var(--border)',
                borderRadius: 10,
              }}
            >
              No documents uploaded yet.
            </div>
          )}

        </div>

      </div>


      {/* =================================================
          APPOINTMENTS
          ================================================= */}

      <div
        className="card"
        style={{
          padding:
            24
        }}
      >

        <h2
          style={{
            fontWeight:
              700,

            color:
              'var(--text)',

            fontSize:
              '0.95rem',

            marginBottom:
              18,
          }}
        >

          Appointments

        </h2>


        <div
          style={{
            display:
              'flex',

            flexDirection:
              'column',

            gap:
              12,
          }}
        >

          {appointments.length ? (
            appointments.map(
              (a, i) => (
                <div key={i}>
                  {a.with}
                </div>
              )
            )
          ) : (
            <div
              style={{
                padding: '18px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                border: '1px dashed var(--border)',
                borderRadius: 10,
              }}
            >
              No appointments yet.
            </div>
          )}

        </div>

      </div>


      {/* =================================================
          RESPONSIVE
          ================================================= */}

      <style>{`

        @media (max-width: 700px) {

          .form-grid {
            grid-template-columns:
              1fr !important;
          }

        }

      `}</style>

    </div>

  )

}