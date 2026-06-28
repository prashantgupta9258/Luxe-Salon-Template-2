import React, { lazy, Suspense } from "react";
import { motion } from "motion/react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";

const Services = lazy(() => import("../components/Services"));
const Reviews = lazy(() => import("../components/Reviews"));
const Contact = lazy(() => import("../components/Contact"));
const Footer = lazy(() => import("../components/Footer"));

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <Navbar />
      <main id="main-content">
        <Hero />
        <Suspense fallback={<div className="h-24"></div>}>
          <Services />
        </Suspense>
        <Suspense fallback={<div className="h-24"></div>}>
          <Reviews />
        </Suspense>
        {/* We add a dummy About section to fix the anchor */}
        <section
          id="about"
          className="py-24 bg-white"
          itemScope
          itemType="https://schema.org/AboutPage"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto px-6 text-center"
          >
            <h2
              className="font-serif text-4xl md:text-5xl text-[#1C1917] mb-6"
              itemProp="headline"
            >
              Why Choose Lumx Salon Agra?
            </h2>
            <p
              className="text-gray-600 text-lg leading-relaxed"
              itemProp="text"
            >
              Founded with a passion for luxury and style,{" "}
              <strong>Lumx Salon Agra</strong> represents the pinnacle of modern
              hair design and beauty services in Agra, Uttar Pradesh. Our team
              of expert stylists are dedicated to bringing out your natural
              beauty through personalized consultations, bespoke balayage
              treatments, and precision haircuts. We believe every appointment
              should be an experience of relaxation, transformation, and pure
              indulgence at our premium beauty salon.
            </p>
          </motion.div>
        </section>
        <Suspense fallback={<div className="h-24"></div>}>
          <Contact />
        </Suspense>
      </main>
      <Suspense fallback={<div className="h-24"></div>}>
        <Footer />
      </Suspense>
    </div>
  );
}
