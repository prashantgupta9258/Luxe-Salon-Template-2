import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { MapPin, Phone, Mail, Clock, Calendar, Check } from "lucide-react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";

export default React.memo(function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    date: "",
    time: "",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [closedMessage, setClosedMessage] = useState<string>("");

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "salon"),
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        } else {
          // Default settings
          const DAYS = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          const defaultHours: any = {};
          DAYS.forEach((_, i) => {
            defaultHours[i] = {
              isOpen: i !== 0 && i !== 1,
              open: i === 6 ? "09:00" : "10:00",
              close: i === 6 ? "18:00" : "20:00",
            };
          });
          setSettings({ businessHours: defaultHours, closedPeriods: [] });
        }
      },
      (e) => {
        console.error("Failed to fetch settings", e);
      },
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!formData.date || !settings) {
      setClosedMessage("");
      return;
    }

    const [year, month, day] = formData.date.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    const daySettings = settings.businessHours?.[dayOfWeek];
    if (!daySettings || !daySettings.isOpen) {
      setClosedMessage(
        `Our salon is closed on ${dateObj.toLocaleDateString("en-US", { weekday: "long" })}s.`,
      );
      return;
    }

    const dateClosures = settings.closedPeriods?.filter(
      (p: any) => p.date === formData.date,
    );
    if (dateClosures && dateClosures.length > 0) {
      const wholeDay = dateClosures.find(
        (p: any) => !p.startTime && !p.endTime,
      );
      if (wholeDay) {
        setClosedMessage(
          `Our salon is closed on this date${wholeDay.reason ? `: ${wholeDay.reason}` : "."}`,
        );
      } else {
        const partials = dateClosures.filter(
          (p: any) => p.startTime && p.endTime,
        );
        if (partials.length > 0) {
          const msgs = partials.map((p: any) => {
            const formatTime = (t: string) => {
              const [h, m] = t.split(":").map(Number);
              const ampm = h >= 12 ? "PM" : "AM";
              const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
              return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
            };
            return `Closed ${formatTime(p.startTime)} - ${formatTime(p.endTime)}${p.reason ? ` (${p.reason})` : ""}`;
          });
          setClosedMessage(msgs.join(", "));
          return;
        }
      }
      return;
    }

    setClosedMessage("");
  }, [formData.date, settings]);

  useEffect(() => {
    if (formData.date) {
      const q = query(
        collection(db, "appointments"),
        where("date", "==", formData.date),
      );
      getDocs(q)
        .then((snapshot) => {
          setBookedSlots(snapshot.docs.map((d) => d.data().time));
        })
        .catch((e) => {
          const appts = JSON.parse(
            localStorage.getItem("lumx_appointments") || "[]",
          );
          setBookedSlots(
            appts
              .filter((a: any) => a.date === formData.date)
              .map((a: any) => a.time),
          );
        });
    } else {
      setBookedSlots([]);
    }
  }, [formData.date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.time) {
      alert("Please select a valid date and time for your appointment.");
      return;
    }
    if (bookedSlots.includes(formData.time)) {
      alert("This slot is already booked. Please choose another time.");
      return;
    }
    try {
      await addDoc(collection(db, "appointments"), {
        ...formData,
        createdAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error(
        "Failed to add appointment to Firebase, falling back locally",
        e,
      );
      const updatedAppts = JSON.parse(
        localStorage.getItem("lumx_appointments") || "[]",
      );
      updatedAppts.push({
        ...formData,
        id: Date.now().toString(),
        createdAt: Date.now(),
      });
      localStorage.setItem("lumx_appointments", JSON.stringify(updatedAppts));
    }
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setFormData({
      name: "",
      phone: "",
      email: "",
      service: "",
      date: "",
      time: "",
      notes: "",
    });
  };

  const getAvailableSlots = () => {
    if (!formData.date || !settings) return [];

    const [year, month, day] = formData.date.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    const daySettings = settings.businessHours?.[dayOfWeek];
    if (!daySettings || !daySettings.isOpen) {
      return [];
    }

    // Check special closed whole-days
    const closedWholeDay = settings.closedPeriods?.find(
      (p: any) => p.date === formData.date && !p.startTime && !p.endTime,
    );
    if (closedWholeDay) {
      return [];
    }

    const parseTime = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const openMinutes = parseTime(daySettings.open);
    const closeMinutes = parseTime(daySettings.close);

    const slots = [];
    for (let m = openMinutes; m < closeMinutes; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;

      const slotTimeStr = `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;

      const isPeriodClosed = settings.closedPeriods?.find(
        (p: any) =>
          p.date === formData.date &&
          p.startTime &&
          p.endTime &&
          p.startTime <= slotTimeStr &&
          p.endTime > slotTimeStr,
      );
      if (isPeriodClosed) continue;

      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h >= 12 ? "PM" : "AM";
      const timeLabel = `${hour12}:${min === 0 ? "00" : "30"} ${ampm}`;

      slots.push({
        label: timeLabel,
        value: timeLabel,
        isBooked: bookedSlots.includes(timeLabel),
      });
    }
    return slots;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    if (!selectedDate) {
      setFormData({ ...formData, date: "", time: "" });
      return;
    }

    setFormData({ ...formData, date: selectedDate, time: "" });
  };

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8">
          {/* Booking Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            id="booking"
            className="bg-[#FAF6F0] p-8 md:p-12 rounded-sm shadow-md border border-[#E8E1D7]"
          >
            <h2 className="font-serif text-4xl md:text-5xl text-[#1C1917] mb-4">
              Book Your Appointment Today
            </h2>
            <p className="text-gray-600 mb-8">
              Select your service, preferred date and time. We will confirm your
              appointment shortly.
            </p>

            {submitted ? (
              <div className="bg-green-50 border border-green-200 text-green-800 p-8 rounded-sm text-center">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-serif mb-2">Request Received</h3>
                <p>
                  Thank you! We have received your appointment request and will
                  contact you shortly to confirm.
                </p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="name"
                      className="text-sm font-medium text-gray-700"
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="border-b border-gray-300 py-2 focus:outline-none focus:border-[#C4A47C] bg-transparent transition-colors text-gray-900 placeholder-gray-400"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="phone"
                      className="text-sm font-medium text-gray-700"
                    >
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="border-b border-gray-300 py-2 focus:outline-none focus:border-[#C4A47C] bg-transparent transition-colors text-gray-900 placeholder-gray-400"
                      placeholder="(555) 000-0000"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="border-b border-gray-300 py-2 focus:outline-none focus:border-[#C4A47C] bg-transparent transition-colors text-gray-900 placeholder-gray-400"
                    placeholder="jane@example.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="date"
                      className="text-sm font-medium text-gray-700"
                    >
                      Preferred Date *
                    </label>
                    <input
                      type="date"
                      id="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={formData.date}
                      onChange={handleDateChange}
                      className="border-b border-gray-300 py-2 focus:outline-none focus:border-[#C4A47C] bg-transparent transition-colors text-gray-900"
                    />
                    {closedMessage && (
                      <span
                        className={`text-xs mt-1 ${getAvailableSlots().length === 0 ? "text-red-500" : "text-orange-500"}`}
                      >
                        {closedMessage}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="time"
                      className="text-sm font-medium text-gray-700"
                    >
                      Preferred Time *
                    </label>
                    <select
                      id="time"
                      required
                      value={formData.time}
                      onChange={(e) =>
                        setFormData({ ...formData, time: e.target.value })
                      }
                      className="border-b border-gray-300 py-2 focus:outline-none focus:border-[#C4A47C] bg-transparent transition-colors text-gray-900 disabled:opacity-50"
                      disabled={
                        !formData.date || getAvailableSlots().length === 0
                      }
                    >
                      <option value="" disabled>
                        {formData.date
                          ? "Select a time"
                          : "Select a date first"}
                      </option>
                      {getAvailableSlots().map((slot: any) => (
                        <option
                          key={slot.value}
                          value={slot.value}
                          disabled={slot.isBooked}
                        >
                          {slot.label} {slot.isBooked ? "(Booked)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="service"
                    className="text-sm font-medium text-gray-700"
                  >
                    Service Required *
                  </label>
                  <select
                    id="service"
                    required
                    value={formData.service}
                    onChange={(e) =>
                      setFormData({ ...formData, service: e.target.value })
                    }
                    className="border-b border-gray-300 py-2 focus:outline-none focus:border-[#C4A47C] bg-transparent transition-colors text-gray-900"
                  >
                    <option value="" disabled>
                      Select a service
                    </option>
                    <option value="Women's Haircut">Women's Haircut</option>
                    <option value="Men's Haircut">Men's Classic Cut</option>
                    <option value="Balayage & Highlights">
                      Balayage & Highlights
                    </option>
                    <option value="Full Color">Full Color Renewal</option>
                    <option value="Keratin Treatment">
                      Keratin Smoothing Treatment
                    </option>
                    <option value="Bridal">Bridal Services</option>
                    <option value="Other">Other / Consultation</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="message"
                    className="text-sm font-medium text-gray-700"
                  >
                    Additional Notes
                  </label>
                  <textarea
                    id="message"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="border-b border-gray-300 py-2 focus:outline-none focus:border-[#C4A47C] bg-transparent transition-colors resize-none text-gray-900 placeholder-gray-400"
                    placeholder="Specific stylist requests, condition of hair..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1C1917] text-white py-4 font-medium tracking-wide hover:bg-[#C4A47C] transition-colors rounded-sm mt-4"
                >
                  REQUEST APPOINTMENT
                </button>
              </form>
            )}
          </motion.div>

          {/* Location & Map */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            className="flex flex-col"
            id="contact"
            itemScope
            itemType="https://schema.org/BeautySalon"
          >
            <div className="mb-8 p-8 bg-[#F5F0EB] text-[#1C1917] rounded-sm">
              <h3 className="font-serif text-2xl mb-6" itemProp="name">
                Lumx Salon Agra
              </h3>
              <div className="space-y-4">
                <div
                  className="flex items-start gap-4"
                  itemProp="address"
                  itemScope
                  itemType="https://schema.org/PostalAddress"
                >
                  <MapPin className="text-[#C4A47C] w-5 h-5 shrink-0 mt-1" />
                  <p className="text-sm">
                    <span itemProp="streetAddress">Near Taj Mahal, Agra</span>
                    <br />
                    <span itemProp="addressLocality">Agra</span>,{" "}
                    <span itemProp="addressRegion">Uttar Pradesh</span>{" "}
                    <span itemProp="postalCode">282001</span>,{" "}
                    <span itemProp="addressCountry">India</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Phone className="text-[#C4A47C] w-5 h-5 shrink-0" />
                  <p className="text-sm" itemProp="telephone">
                    +91 98765 43210
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Mail className="text-[#C4A47C] w-5 h-5 shrink-0" />
                  <p className="text-sm" itemProp="email">
                    hello@lumxsalon.in
                  </p>
                </div>
                <div className="flex items-start gap-4 pt-4 border-t border-gray-300/50 mt-4">
                  <Clock className="text-[#C4A47C] w-5 h-5 shrink-0 mt-1" />
                  <div className="text-sm space-y-1 w-full max-w-[200px]">
                    {settings && settings.businessHours ? (
                      [
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                        "Monday",
                      ].map((dayName, idx) => {
                        const dayIndex = [2, 3, 4, 5, 6, 0, 1][idx];
                        const daySetting = settings.businessHours[dayIndex];
                        if (!daySetting) return null;

                        let timeStr = "Closed";
                        if (daySetting.isOpen) {
                          const formatTime = (t: string) => {
                            if (!t) return "";
                            const [h, m] = t.split(":").map(Number);
                            const ampm = h >= 12 ? "pm" : "am";
                            const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
                            return `${hour12}${m > 0 ? ":" + m.toString().padStart(2, "0") : ""}${ampm}`;
                          };
                          timeStr = `${formatTime(daySetting.open)} - ${formatTime(daySetting.close)}`;
                        }
                        return (
                          <div
                            key={dayName}
                            className={`flex justify-between ${!daySetting.isOpen ? "text-gray-500" : ""}`}
                          >
                            <span>{dayName.slice(0, 3)}</span>
                            <span>{timeStr}</span>
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <p className="flex justify-between">
                          <span>Tue - Fri</span> <span>10am - 8pm</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Sat</span> <span>9am - 6pm</span>
                        </p>
                        <p className="flex justify-between text-gray-500">
                          <span>Sun - Mon</span> <span>Closed</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Google Maps iframe */}
            <div className="flex-grow min-h-[300px] w-full bg-gray-200 rounded-sm overflow-hidden">
              <iframe
                title="Lumx Salon Agra Google Maps Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d113554.45524859942!2d77.925501861033!3d27.176274482025735!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39740d857c2f41d9%3A0x784aef38a9523b42!2sAgra%2C%20Uttar%20Pradesh!5e0!3m2!1sen!2sin!4v1715082400000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale contrast-125 opacity-90"
              ></iframe>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});
