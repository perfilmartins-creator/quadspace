import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { Booking } from "@/components/sections/Booking";
import { Structure } from "@/components/sections/Structure";
import { Pricing } from "@/components/sections/Pricing";
import { Possibilities } from "@/components/sections/Possibilities";
import { Gallery } from "@/components/sections/Gallery";
import { Location } from "@/components/sections/Location";
import { FAQ } from "@/components/sections/FAQ";

export default function Home() {
  return (
    <>
      <Header />
      <main id="conteudo" className="flex flex-col">
        <Hero />
        <Booking />
        <Pricing />
        <Structure />
        <Possibilities />
        <Gallery />
        <Location />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
