import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { Space } from "@/components/sections/Space";
import { Structure } from "@/components/sections/Structure";
import { Pricing } from "@/components/sections/Pricing";
import { Possibilities } from "@/components/sections/Possibilities";
import { Gallery } from "@/components/sections/Gallery";
import { Location } from "@/components/sections/Location";
import { FAQ } from "@/components/sections/FAQ";
import { Booking } from "@/components/sections/Booking";

export default function Home() {
  return (
    <>
      <Header />
      <main id="conteudo" className="flex flex-col">
        <Hero />
        <Space />
        <Structure />
        <Pricing />
        <Possibilities />
        <Gallery />
        <Location />
        <FAQ />
        <Booking />
      </main>
      <Footer />
    </>
  );
}
