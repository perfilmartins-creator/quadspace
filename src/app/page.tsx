import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { Manifesto } from "@/components/sections/Manifesto";
import { Space } from "@/components/sections/Space";
import { Structure } from "@/components/sections/Structure";
import { Gallery } from "@/components/sections/Gallery";
import { FAQ } from "@/components/sections/FAQ";
import { Booking } from "@/components/sections/Booking";

export default function Home() {
  return (
    <>
      <Header />
      <main id="conteudo" className="flex flex-col">
        <Hero />
        <Manifesto />
        <Space />
        <Structure />
        <Gallery />
        <FAQ />
        <Booking />
      </main>
      <Footer />
    </>
  );
}
