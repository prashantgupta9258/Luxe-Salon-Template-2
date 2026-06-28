import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Save, Plus, Trash } from "lucide-react";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function AdminSettings() {
  const [businessHours, setBusinessHours] = useState<any>({});
  const [closedPeriods, setClosedPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "settings", "salon");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBusinessHours(data.businessHours || defaultHours());
        setClosedPeriods(data.closedPeriods || []);
      } else {
        setBusinessHours(defaultHours());
      }
    } catch (e) {
      console.error(e);
      // Fallback
      setBusinessHours(defaultHours());
    }
    setLoading(false);
  };

  const defaultHours = () => {
    const hours: any = {};
    DAYS.forEach((_, i) => {
      hours[i] = {
        isOpen: i !== 0 && i !== 1,
        open: i === 6 ? "09:00" : "10:00",
        close: i === 6 ? "18:00" : "20:00",
      };
    });
    return hours;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "salon"), {
        businessHours,
        closedPeriods,
      });
      alert("Settings saved successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save settings.");
    }
    setSaving(false);
  };

  const addClosedPeriod = () => {
    setClosedPeriods([
      ...closedPeriods,
      {
        id: Date.now().toString(),
        date: "",
        startTime: "",
        endTime: "",
        reason: "",
      },
    ]);
  };

  const updateClosedPeriod = (index: number, field: string, value: string) => {
    const updated = [...closedPeriods];
    updated[index][field] = value;
    setClosedPeriods(updated);
  };

  const removeClosedPeriod = (index: number) => {
    const updated = [...closedPeriods];
    updated.splice(index, 1);
    setClosedPeriods(updated);
  };

  if (loading)
    return (
      <div className="p-4 text-gray-500 animate-pulse">Loading settings...</div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-medium mb-4 border-b pb-2">
          Business Hours
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DAYS.map((day, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4 p-4 border rounded bg-gray-50"
            >
              <div className="w-24 font-medium">{day}</div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessHours[i]?.isOpen}
                  onChange={(e) =>
                    setBusinessHours({
                      ...businessHours,
                      [i]: { ...businessHours[i], isOpen: e.target.checked },
                    })
                  }
                />
                <span className="text-sm">Open</span>
              </label>

              {businessHours[i]?.isOpen && (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="time"
                    className="border rounded p-1 text-sm"
                    value={businessHours[i]?.open || ""}
                    onChange={(e) =>
                      setBusinessHours({
                        ...businessHours,
                        [i]: { ...businessHours[i], open: e.target.value },
                      })
                    }
                  />
                  <span className="text-sm text-gray-500">to</span>
                  <input
                    type="time"
                    className="border rounded p-1 text-sm"
                    value={businessHours[i]?.close || ""}
                    onChange={(e) =>
                      setBusinessHours({
                        ...businessHours,
                        [i]: { ...businessHours[i], close: e.target.value },
                      })
                    }
                  />
                </div>
              )}
              {!businessHours[i]?.isOpen && (
                <span className="text-sm text-gray-500 italic">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-xl font-medium">Special Closed Dates & Times</h2>
          <button
            onClick={addClosedPeriod}
            className="flex items-center gap-1 text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Period
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Mark specific dates or time slots as closed (e.g. for holidays,
          personal matters).
        </p>

        {closedPeriods.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No special closed periods defined.
          </p>
        ) : (
          <div className="space-y-4">
            {closedPeriods.map((period, i) => (
              <div
                key={period.id}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-end gap-4 p-4 border rounded bg-gray-50 relative"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Date</label>
                  <input
                    type="date"
                    className="border rounded p-2 text-sm w-full"
                    value={period.date}
                    onChange={(e) =>
                      updateClosedPeriod(i, "date", e.target.value)
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">
                    Start (Optional)
                  </label>
                  <input
                    type="time"
                    className="border rounded p-2 text-sm w-full"
                    value={period.startTime}
                    onChange={(e) =>
                      updateClosedPeriod(i, "startTime", e.target.value)
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">
                    End (Optional)
                  </label>
                  <input
                    type="time"
                    className="border rounded p-2 text-sm w-full"
                    value={period.endTime}
                    onChange={(e) =>
                      updateClosedPeriod(i, "endTime", e.target.value)
                    }
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1 flex-grow">
                  <label className="text-xs text-gray-500">Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Festival"
                    className="border rounded p-2 text-sm w-full"
                    value={period.reason}
                    onChange={(e) =>
                      updateClosedPeriod(i, "reason", e.target.value)
                    }
                  />
                </div>
                <div className="flex justify-end lg:justify-start">
                  <button
                    onClick={() => removeClosedPeriod(i)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors mb-[2px]"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#1C1917] text-white px-6 py-3 rounded hover:bg-[#C4A47C] transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
