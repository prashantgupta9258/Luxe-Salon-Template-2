import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Star } from "lucide-react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";

const formatDate = (createdAt: any, defaultDate: string) => {
  if (!createdAt) return defaultDate;
  try {
    let dateObj;
    if (createdAt.toDate) {
      dateObj = createdAt.toDate();
    } else if (typeof createdAt === "number") {
      dateObj = new Date(createdAt);
    } else {
      return defaultDate;
    }
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (e) {
    return defaultDate;
  }
};

const ReviewCard = React.memo(
  ({ review, index }: { review: any; index: number }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isLong = review.text.length > 120;

    const displayDate = review.createdAt
      ? formatDate(review.createdAt, review.date || "")
      : review.date || "Just now";

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={{ delay: (index % 3) * 0.1 }}
        className="bg-[#24211F] p-8 rounded-sm flex flex-col min-w-[300px] md:min-w-[350px] flex-shrink-0 snap-center"
      >
        <div className="flex gap-1 mb-6">
          {[...Array(review.rating)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-[#C4A47C] text-[#C4A47C]" />
          ))}
        </div>
        <div className="flex-grow mb-8">
          <p className="text-gray-300 italic">
            "
            {isExpanded || !isLong
              ? review.text
              : `${review.text.substring(0, 120)}...`}
            "
          </p>
          {isLong && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[#C4A47C] hover:text-white mt-2 text-sm uppercase tracking-wider text-left transition-colors"
            >
              {isExpanded ? "Read Less" : "Read More"}
            </button>
          )}
        </div>
        <div>
          <p className="font-serif text-lg">{review.name}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
            {displayDate}
          </p>
        </div>
      </motion.div>
    );
  },
);

export default React.memo(function Reviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", text: "", rating: 5 });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, "reviews"),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(q);
        const fetchedReviews = snapshot.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
          .map((data) => ({ ...data, date: data.date || "Just now" }));

        setReviews(fetchedReviews);
      } catch (e) {
        console.warn(
          "Firebase query failed or unconfigured, falling back to local storage",
        );
        const storedRevs = JSON.parse(
          localStorage.getItem("lumx_reviews") || "[]",
        );
        if (storedRevs.length === 0) {
          const initial = [
            {
              id: "1",
              name: "Sarah Jenkins",
              text: "Absolutely the best salon experience I've ever had. The staff was incredibly welcoming, the ambiance was perfectly relaxing, and the results were beyond my expectations. I will definitely be coming back and recommending Lumx to all my friends! They really take the time to understand what you want.",
              rating: 5,
              date: "2 weeks ago",
              approved: true,
            },
            {
              id: "2",
              name: "Emily Rodriguez",
              text: "A beautiful, relaxing environment.",
              rating: 5,
              date: "1 month ago",
              approved: true,
            },
            {
              id: "3",
              name: "Mia Thompson",
              text: "So impressed with the attention to detail.",
              rating: 5,
              date: "2 months ago",
              approved: true,
            },
          ];
          localStorage.setItem("lumx_reviews", JSON.stringify(initial));
          setReviews(initial);
        } else {
          setReviews(storedRevs.filter((r: any) => r.approved).reverse());
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const newReview = {
      ...formData,
      date: "Just now",
      approved: true,
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, "reviews"), newReview);
      const localReview = {
        ...newReview,
        id: docRef.id,
        approved: true,
        createdAt: Date.now(),
      };
      setReviews((prev) => [localReview, ...prev]);
    } catch (e: any) {
      console.error("Failed to submit review to Firebase, saving locally", e);
      const localReview = {
        ...newReview,
        id: Date.now().toString(),
        approved: true,
        createdAt: Date.now(),
      };
      const storedRevs = JSON.parse(
        localStorage.getItem("lumx_reviews") || "[]",
      );
      storedRevs.push(localReview);
      localStorage.setItem("lumx_reviews", JSON.stringify(storedRevs));
      setReviews((prev) => [localReview, ...prev]);
    }
    setSubmitted(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setSubmitted(false);
      setFormData({ name: "", text: "", rating: 5 });
    }, 2000);
  };

  return (
    <section id="reviews" className="py-24 bg-[#1C1917] text-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            className="text-[#C4A47C] font-semibold tracking-widest text-sm uppercase mb-4"
          >
            Client Stories
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-4xl md:text-5xl mb-6"
          >
            Love from our clients
          </motion.h2>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ delay: 0.2 }}
            onClick={() => setIsModalOpen(true)}
            className="border-b border-[#C4A47C] text-[#C4A47C] pb-1 hover:text-white hover:border-white transition-colors"
          >
            Leave a Review
          </motion.button>
        </div>

        {isLoading ? (
          <div
            className="flex overflow-x-auto gap-8 pb-8 snap-x scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="bg-[#24211F] p-8 rounded-sm flex flex-col min-w-[300px] md:min-w-[350px] flex-shrink-0 snap-center animate-pulse"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 bg-[#3a3532] rounded-sm"
                    ></div>
                  ))}
                </div>
                <div className="h-4 bg-[#3a3532] rounded mb-3 w-full mt-4"></div>
                <div className="h-4 bg-[#3a3532] rounded mb-8 w-2/3 flex-grow"></div>
                <div>
                  <div className="h-6 bg-[#3a3532] rounded mb-2 w-1/2"></div>
                  <div className="h-3 bg-[#3a3532] rounded w-1/3 mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-center text-gray-500">
            No reviews yet. Be the first to leave one!
          </p>
        ) : (
          <div
            className="flex overflow-x-auto gap-8 pb-8 snap-x scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {reviews.map((review, index) => (
              <ReviewCard key={review.id} review={review} index={index} />
            ))}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 z-50 overflow-y-auto"
            onClick={() => setIsModalOpen(false)}
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-[#F5F0EB] shadow-2xl border-solid border border-[#C4A47C]/20 text-[#1C1917] p-6 md:p-10 rounded-[35px] max-w-[90vw] md:max-w-md w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
                  aria-label="Close modal"
                >
                  ✕
                </button>

                {submitted ? (
                  <div className="text-center py-8">
                    <h3 className="text-2xl font-serif text-[#C4A47C] mb-2">
                      Thank You!
                    </h3>
                    <p className="text-gray-600">Your review has been added.</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-2xl md:text-3xl font-serif mb-2 text-center text-[#1C1917]">
                      Share Your Experience
                    </h3>
                    <p className="text-center text-sm text-gray-500 mb-6 md:mb-8">
                      We would love to hear about your experience at Lumx Salon
                      Agra.
                    </p>
                    <form
                      onSubmit={submitReview}
                      className="space-y-4 md:space-y-6"
                    >
                      <div>
                        <label
                          htmlFor="review-name"
                          className="block text-xs font-medium uppercase tracking-widest text-gray-500 mb-1 md:mb-2"
                        >
                          Your Name
                        </label>
                        <input
                          id="review-name"
                          required
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full bg-transparent border-b border-gray-300 py-2 focus:outline-none focus:border-[#C4A47C] transition-colors"
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="review-rating"
                          className="block text-xs font-medium uppercase tracking-widest text-gray-500 mb-1 md:mb-2"
                        >
                          Rating
                        </label>
                        <select
                          id="review-rating"
                          value={formData.rating}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              rating: Number(e.target.value),
                            })
                          }
                          className="w-full bg-transparent border-b border-gray-300 py-2 focus:outline-none focus:border-[#C4A47C] transition-colors appearance-none"
                        >
                          {[5, 4, 3, 2, 1].map((r) => (
                            <option key={r} value={r}>
                              {r} Stars
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="review-text"
                          className="block text-xs font-medium uppercase tracking-widest text-gray-500 mb-1 md:mb-2"
                        >
                          Your Review
                        </label>
                        <textarea
                          id="review-text"
                          required
                          rows={3}
                          value={formData.text}
                          onChange={(e) =>
                            setFormData({ ...formData, text: e.target.value })
                          }
                          className="w-full bg-transparent border-b border-gray-300 py-2 focus:outline-none focus:border-[#C4A47C] resize-none transition-colors"
                          placeholder="Tell us what you loved..."
                        ></textarea>
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-[#1C1917] text-white font-medium tracking-wide py-3 md:py-4 hover:bg-[#C4A47C] transition-colors rounded-sm mt-2 md:mt-4"
                      >
                        SUBMIT REVIEW
                      </button>
                    </form>
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
});
