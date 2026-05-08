import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import PublicHome from "@/components/PublicHome";
import Image from "next/image";

export default function Home() {
  return (
    <div className="w-full min-h-screen bg-white">
      <Nav/>
      <PublicHome/>
      <Footer/>
    </div>
  );
}
