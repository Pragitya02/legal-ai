import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Calendar,
  Users,
  DollarSign,
  Star,
  Scale,
  FileText,
  Clock,
  MessageSquare,
  Plus,
  ArrowRight,
  CheckCircle,
} from "lucide-react";


// =====================================================
// CONFIG
// =====================================================

const API_URL = "https://legal-ai-z7vb.onrender.com";


// =====================================================
// TYPES
// =====================================================

interface User {
  id?: number | string;
  fullName?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

interface DashboardStats {
  appointments: string | number;
  clients: string | number;
  earnings: string | number;
  rating: string | number;
  analyses: string | number;
  cases: string | number;
}

interface Appointment {
  id: number | string;
  clientName?: string;
  client?: string;
  date?: string;
  time?: string;
  type?: string;
  status?: string;
}


// =====================================================
// HELPERS
// =====================================================

function getToken(): string {
  return localStorage.getItem("token") || "";
}


function getStoredUser(): User | null {

  try {

    const stored =
      localStorage.getItem("user");

    if (!stored) {
      return null;
    }

    return JSON.parse(stored);

  } catch (error) {

    console.error(
      "Unable to read stored user:",
      error
    );

    return null;
  }
}


function getUserName(
  user: User | null
): string {

  if (!user) {
    return "User";
  }

  const name =
    user.fullName ||
    user.full_name ||
    "User";

  return String(name)
    .replace(/^Adv\.\s*/i, "")
    .trim();
}


// =====================================================
// MAIN COMPONENT
// =====================================================

export default function AdvocateDashboard() {

  // ---------------------------------------------------
  // USER
  // ---------------------------------------------------

  const [
    user,
    setUser
  ] = useState<User | null>(
    getStoredUser()
  );


  // ---------------------------------------------------
  // LOADING
  // ---------------------------------------------------

  const [
    loading,
    setLoading
  ] = useState(true);


  // ---------------------------------------------------
  // STATS
  //
  // IMPORTANT:
  // NO FAKE DEFAULT NUMBERS.
  // ---------------------------------------------------

  const [
    stats,
    setStats
  ] = useState<DashboardStats>({

    appointments: "__",

    clients: "__",

    earnings: "__",

    rating: "__",

    analyses: "__",

    cases: "__",

  });


  // ---------------------------------------------------
  // APPOINTMENTS
  //
  // Empty until real API data exists.
  // ---------------------------------------------------

  const [
    appointments,
    setAppointments
  ] = useState<Appointment[]>([]);


  // ===================================================
  // LOAD PROFILE
  // ===================================================

  useEffect(() => {

    async function loadProfile() {

      try {

        const token =
          getToken();

        if (!token) {

          setLoading(false);

          return;
        }


        const response =
          await fetch(
            `${API_URL}/api/profile`,
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },
            }
          );


        if (!response.ok) {

          console.error(
            "Profile API failed:",
            response.status
          );

          return;
        }


        const data =
          await response.json();


        if (
          data.success &&
          data.user
        ) {

          setUser(
            data.user
          );


          localStorage.setItem(
            "user",
            JSON.stringify(
              data.user
            )
          );
        }

      } catch (error) {

        console.error(
          "PROFILE ERROR:",
          error
        );

      } finally {

        setLoading(false);
      }
    }


    loadProfile();

  }, []);


  // ===================================================
  // LOAD REAL DASHBOARD DATA
  // ===================================================

  useEffect(() => {

    async function loadDashboardData() {

      try {

        const token =
          getToken();

        if (!token) {
          return;
        }


        /*
         * IMPORTANT
         *
         * We are NOT creating fake values here.
         *
         * When your real dashboard API is ready,
         * replace this section with the API call.
         *
         * Example:
         *
         * const response = await fetch(
         *   `${API_URL}/api/lawyers/dashboard`,
         *   {
         *     headers: {
         *       Authorization:
         *         `Bearer ${token}`
         *     }
         *   }
         * );
         *
         * const data = await response.json();
         */


        // ------------------------------------------------
        // KEEP ALL VALUES EMPTY UNTIL REAL DATA EXISTS
        // ------------------------------------------------

        setStats({

          appointments: "__",

          clients: "__",

          earnings: "__",

          rating: "__",

          analyses: "__",

          cases: "__",

        });


        // ------------------------------------------------
        // NO DEMO APPOINTMENTS
        // ------------------------------------------------

        setAppointments([]);

      } catch (error) {

        console.error(
          "DASHBOARD ERROR:",
          error
        );

      }

    }


    loadDashboardData();

  }, []);


  // ===================================================
  // USER NAME
  // ===================================================

  const userName =
    getUserName(user);


  // ===================================================
  // STAT CARDS
  // ===================================================

  const statCards = [

    {
      icon: Calendar,

      value:
        stats.appointments,

      label:
        "Today's Appointments",

      color:
        "var(--blue)",
    },

    {
      icon: Users,

      value:
        stats.clients,

      label:
        "Active Clients",

      color:
        "#7C3AED",
    },

    {
      icon: DollarSign,

      value:
        stats.earnings,

      label:
        "Earnings",

      color:
        "var(--emerald)",
    },

    {
      icon: Star,

      value:
        stats.rating,

      label:
        "Rating",

      color:
        "#F59E0B",
    },

  ];


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {

    return (

      <div
        style={{
          minHeight:
            "60vh",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          color:
            "var(--text-muted)",
        }}
      >

        Loading dashboard...

      </div>

    );

  }


  // ===================================================
  // DASHBOARD
  // ===================================================

  return (

    <div
      style={{
        width:
          "100%",
      }}
    >

      {/* =================================================
          WELCOME HEADER
      ================================================= */}

      <section
        style={{
          background:
            "linear-gradient(135deg, #2563EB, #4F46E5)",

          borderRadius:
            16,

          padding:
            "24px",

          marginBottom:
            20,

          color:
            "white",

          position:
            "relative",

          overflow:
            "hidden",
        }}
      >

        {/* Decorative circle */}

        <div
          style={{
            position:
              "absolute",

            width:
              220,

            height:
              220,

            borderRadius:
              "50%",

            background:
              "rgba(255,255,255,0.08)",

            right:
              -80,

            top:
              -100,
          }}
        />


        <div
          style={{
            position:
              "relative",

            zIndex:
              1,
          }}
        >

          {/* HEADER */}

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "space-between",

              gap:
                20,

              flexWrap:
                "wrap",
            }}
          >

            <div>

              <div
                style={{
                  fontSize:
                    "0.8rem",

                  opacity:
                    0.7,

                  marginBottom:
                    4,
                }}
              >

                Good morning 🌟

              </div>


              <h1
                style={{
                  margin:
                    0,

                  fontSize:
                    "1.5rem",

                  fontWeight:
                    800,

                  letterSpacing:
                    "-0.03em",
                }}
              >

                Adv. {userName}

              </h1>


              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    8,

                  marginTop:
                    8,
                }}
              >

                <span
                  style={{
                    padding:
                      "3px 10px",

                    borderRadius:
                      99,

                    background:
                      "rgba(255,255,255,0.18)",

                    fontSize:
                      "0.7rem",

                    fontWeight:
                      700,
                  }}
                >

                  ✓ Advocate

                </span>


                <span
                  style={{
                    fontSize:
                      "0.78rem",

                    opacity:
                      0.7,
                  }}
                >

                  NyayaAI Legal Platform

                </span>

              </div>

            </div>


            {/* AI RESEARCH */}

            <Link
              to="/advocate/ai-research"

              style={{
                padding:
                  "10px 18px",

                borderRadius:
                  10,

                background:
                  "rgba(255,255,255,0.15)",

                border:
                  "1px solid rgba(255,255,255,0.25)",

                color:
                  "white",

                textDecoration:
                  "none",

                fontSize:
                  "0.875rem",

                fontWeight:
                  600,

                display:
                  "flex",

                alignItems:
                  "center",

                gap:
                  6,
              }}
            >

              <Scale
                size={15}
              />

              AI Research Assistant

            </Link>

          </div>


          {/* HEADER STAT VALUES */}

          <div
            style={{
              display:
                "flex",

              gap:
                16,

              marginTop:
                20,

              flexWrap:
                "wrap",
            }}
          >

            {statCards.map(
              (stat) => (

                <div
                  key={
                    stat.label
                  }

                  style={{
                    padding:
                      "10px 14px",

                    borderRadius:
                      10,

                    background:
                      "rgba(255,255,255,0.12)",

                    border:
                      "1px solid rgba(255,255,255,0.15)",

                    minWidth:
                      125,
                  }}
                >

                  <div
                    style={{
                      fontSize:
                        "1.2rem",

                      fontWeight:
                        800,

                      color:
                        "white",
                    }}
                  >

                    {stat.value}

                  </div>


                  <div
                    style={{
                      fontSize:
                        "0.68rem",

                      color:
                        "rgba(255,255,255,0.65)",

                      marginTop:
                        1,
                    }}
                  >

                    {stat.label}

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      </section>


      {/* =================================================
          STAT CARDS
      ================================================= */}

      <div
        className="stats-row"

        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(4, 1fr)",

          gap:
            14,

          marginBottom:
            20,
        }}
      >

        {statCards.map(
          (stat) => {

            const Icon =
              stat.icon;

            return (

              <div
                key={
                  stat.label
                }

                className="card"

                style={{
                  padding:
                    18,
                }}
              >

                <div
                  style={{
                    width:
                      36,

                    height:
                      36,

                    borderRadius:
                      9,

                    background:
                      `${stat.color}18`,

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    marginBottom:
                      12,
                  }}
                >

                  <Icon
                    size={17}
                    color={
                      stat.color
                    }
                  />

                </div>


                <div
                  style={{
                    fontSize:
                      "1.4rem",

                    fontWeight:
                      800,

                    color:
                      "var(--text)",

                    marginBottom:
                      3,
                  }}
                >

                  {stat.value}

                </div>


                <div
                  style={{
                    fontSize:
                      "0.72rem",

                    color:
                      "var(--text-muted)",
                  }}
                >

                  {stat.label}

                </div>

              </div>

            );

          }
        )}

      </div>


      {/* =================================================
          EXTRA REAL-DATA STATISTICS
      ================================================= */}

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(2, 1fr)",

          gap:
            14,

          marginBottom:
            20,
        }}

        className="extra-stats-row"
      >

        {/* CASES */}

        <div
          className="card"

          style={{
            padding:
              18,

            display:
              "flex",

            alignItems:
              "center",

            gap:
              14,
          }}
        >

          <div
            style={{
              width:
                38,

              height:
                38,

              borderRadius:
                10,

              background:
                "rgba(37,99,235,0.10)",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",
            }}
          >

            <FileText
              size={18}
              color={
                "var(--blue)"
              }
            />

          </div>


          <div>

            <div
              style={{
                fontSize:
                  "1.25rem",

                fontWeight:
                  800,

                color:
                  "var(--text)",
              }}
            >

              {stats.cases}

            </div>


            <div
              style={{
                fontSize:
                  "0.72rem",

                color:
                  "var(--text-muted)",
              }}
            >

              Total Cases

            </div>

          </div>

        </div>


        {/* ANALYSES */}

        <div
          className="card"

          style={{
            padding:
              18,

            display:
              "flex",

            alignItems:
              "center",

            gap:
              14,
          }}
        >

          <div
            style={{
              width:
                38,

              height:
                38,

              borderRadius:
                10,

              background:
                "rgba(124,58,237,0.10)",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",
            }}
          >

            <Scale
              size={18}
              color="#7C3AED"
            />

          </div>


          <div>

            <div
              style={{
                fontSize:
                  "1.25rem",

                fontWeight:
                  800,

                color:
                  "var(--text)",
              }}
            >

              {stats.analyses}

            </div>


            <div
              style={{
                fontSize:
                  "0.72rem",

                color:
                  "var(--text-muted)",
              }}
            >

              AI Analyses

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <div
        className="dashboard-main-grid"

        style={{
          display:
            "grid",

          gridTemplateColumns:
            "2fr 1fr",

          gap:
            20,
        }}
      >

        {/* =================================================
            APPOINTMENTS
        ================================================= */}

        <section
          className="card"

          style={{
            padding:
              20,
          }}
        >

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "center",

              marginBottom:
                18,
            }}
          >

            <div>

              <h2
                style={{
                  margin:
                    0,

                  fontSize:
                    "1rem",

                  fontWeight:
                    700,

                  color:
                    "var(--text)",
                }}
              >

                Today's Appointments

              </h2>


              <p
                style={{
                  margin:
                    "4px 0 0",

                  fontSize:
                    "0.72rem",

                  color:
                    "var(--text-muted)",
                }}
              >

                Real appointments from your account

              </p>

            </div>


            <Link
              to="/advocate/appointments"

              style={{
                fontSize:
                  "0.75rem",

                color:
                  "var(--blue)",

                textDecoration:
                  "none",

                display:
                  "flex",

                alignItems:
                  "center",

                gap:
                  4,

                fontWeight:
                  600,
              }}
            >

              View all

              <ArrowRight
                size={13}
              />

            </Link>

          </div>


          {/* NO FAKE APPOINTMENTS */}

          {appointments.length === 0 ? (

            <div
              style={{
                padding:
                  "42px 20px",

                textAlign:
                  "center",

                border:
                  "1px dashed var(--border)",

                borderRadius:
                  12,

                background:
                  "var(--bg-secondary)",
              }}
            >

              <Calendar
                size={30}
                style={{
                  color:
                    "var(--text-subtle)",

                  marginBottom:
                    10,
                }}
              />


              <div
                style={{
                  fontSize:
                    "0.85rem",

                  fontWeight:
                    600,

                  color:
                    "var(--text)",
                }}
              >

                No real appointment data

              </div>


              <div
                style={{
                  fontSize:
                    "0.72rem",

                  color:
                    "var(--text-muted)",

                  marginTop:
                    5,
                }}
              >

                Appointments will appear
                here when real data is available.

              </div>

            </div>

          ) : (

            <div>

              {appointments.map(
                (appointment) => (

                  <div
                    key={
                      appointment.id
                    }

                    style={{
                      display:
                        "flex",

                      alignItems:
                        "center",

                      gap:
                        12,

                      padding:
                        "12px 0",

                      borderBottom:
                        "1px solid var(--border)",
                    }}
                  >

                    <Calendar
                      size={18}
                      color={
                        "var(--blue)"
                      }
                    />


                    <div>

                      <div
                        style={{
                          fontSize:
                            "0.8rem",

                          fontWeight:
                            600,

                          color:
                            "var(--text)",
                        }}
                      >

                        {
                          appointment.clientName ||
                          appointment.client ||
                          "Client"
                        }

                      </div>


                      <div
                        style={{
                          fontSize:
                            "0.68rem",

                          color:
                            "var(--text-muted)",
                        }}
                      >

                        {
                          appointment.date ||
                          ""
                        }

                        {" "}

                        {
                          appointment.time ||
                          ""
                        }

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>


        {/* =================================================
            QUICK ACTIONS
        ================================================= */}

        <section
          className="card"

          style={{
            padding:
              20,
          }}
        >

          <h2
            style={{
              margin:
                "0 0 16px",

              fontSize:
                "1rem",

              fontWeight:
                700,

              color:
                "var(--text)",
            }}
          >

            Quick Actions

          </h2>


          <div
            style={{
              display:
                "flex",

              flexDirection:
                "column",

              gap:
                8,
            }}
          >

            <Link
              to="/advocate/ai-research"

              style={quickActionStyle}
            >

              <Scale
                size={17}
                color={
                  "var(--blue)"
                }
              />

              AI Legal Research

            </Link>


            <Link
              to="/advocate/clients"

              style={quickActionStyle}
            >

              <Users
                size={17}
                color="#7C3AED"
              />

              Manage Clients

            </Link>


            <Link
              to="/advocate/documents"

              style={quickActionStyle}
            >

              <FileText
                size={17}
                color={
                  "var(--emerald)"
                }
              />

              Documents

            </Link>


            <Link
              to="/advocate/appointments"

              style={quickActionStyle}
            >

              <Calendar
                size={17}
                color="#F59E0B"
              />

              Appointments

            </Link>

          </div>

        </section>

      </div>


      {/* =================================================
          LOWER CARDS
      ================================================= */}

      <div
        className="dashboard-lower-grid"

        style={{
          display:
            "grid",

          gridTemplateColumns:
            "1fr 1fr",

          gap:
            20,

          marginTop:
            20,
        }}
      >

        {/* =================================================
            EARNINGS
        ================================================= */}

        <section
          className="card"

          style={{
            padding:
              20,
          }}
        >

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                8,

              marginBottom:
                16,
            }}
          >

            <DollarSign
              size={17}
              color={
                "var(--emerald)"
              }
            />


            <h2
              style={{
                margin:
                  0,

                fontSize:
                  "1rem",

                fontWeight:
                  700,

                color:
                  "var(--text)",
              }}
            >

              Earnings Overview

            </h2>

          </div>


          <div
            style={{
              minHeight:
                180,

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              border:
                "1px dashed var(--border)",

              borderRadius:
                12,

              background:
                "var(--bg-secondary)",
            }}
          >

            <div
              style={{
                textAlign:
                  "center",
              }}
            >

              <div
                style={{
                  fontSize:
                    "2rem",

                  fontWeight:
                    800,

                  color:
                    "var(--text)",
                }}
              >

                {stats.earnings}

              </div>


              <div
                style={{
                  fontSize:
                    "0.72rem",

                  color:
                    "var(--text-muted)",

                  marginTop:
                    5,
                }}
              >

                Real earnings only

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            ACTIVITY
        ================================================= */}

        <section
          className="card"

          style={{
            padding:
              20,
          }}
        >

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                8,

              marginBottom:
                16,
            }}
          >

            <Clock
              size={17}
              color={
                "var(--blue)"
              }
            />


            <h2
              style={{
                margin:
                  0,

                fontSize:
                  "1rem",

                fontWeight:
                  700,

                color:
                  "var(--text)",
              }}
            >

              Recent Activity

            </h2>

          </div>


          <div
            style={{
              minHeight:
                180,

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              border:
                "1px dashed var(--border)",

              borderRadius:
                12,

              background:
                "var(--bg-secondary)",
            }}
          >

            <div
              style={{
                textAlign:
                  "center",
              }}
            >

              <MessageSquare
                size={28}
                style={{
                  color:
                    "var(--text-subtle)",

                  marginBottom:
                    8,
                }}
              />


              <div
                style={{
                  fontSize:
                    "0.85rem",

                  fontWeight:
                    600,

                  color:
                    "var(--text)",
                }}
              >

                No activity data

              </div>


              <div
                style={{
                  fontSize:
                    "0.7rem",

                  color:
                    "var(--text-muted)",

                  marginTop:
                    4,
                }}
              >

                Real activity will appear
                when connected to the backend.

              </div>

            </div>

          </div>

        </section>

      </div>


      {/* =================================================
          REAL DATA NOTICE
      ================================================= */}

      <section
        style={{
          marginTop:
            20,

          padding:
            "14px 16px",

          borderRadius:
            10,

          background:
            "var(--blue-subtle)",

          border:
            "1px solid var(--blue-light)",

          display:
            "flex",

          alignItems:
            "center",

          gap:
            10,
        }}
      >

        <CheckCircle
          size={17}
          color={
            "var(--blue)"
          }
        />


        <div
          style={{
            fontSize:
              "0.72rem",

            color:
              "var(--text-muted)",

            lineHeight:
              1.5,
          }}
        >

          Dashboard values are shown only when
          real backend data is available.
          Otherwise the value is displayed as
          <strong> __ </strong>.

        </div>

      </section>

    </div>

  );
}


// =====================================================
// QUICK ACTION STYLE
// =====================================================

const quickActionStyle: React.CSSProperties = {

  display:
    "flex",

  alignItems:
    "center",

  gap:
    10,

  padding:
    12,

  borderRadius:
    9,

  background:
    "var(--bg-secondary)",

  border:
    "1px solid var(--border)",

  textDecoration:
    "none",

  color:
    "var(--text)",

  fontSize:
    "0.78rem",

  fontWeight:
    600,

};