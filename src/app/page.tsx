import { auth } from "@/auth";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { Pricing } from "@/components/landing/Pricing";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { Showcase } from "@/components/landing/Showcase";
import { Testimonials } from "@/components/landing/Testimonials";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import "./landing-theme.css";

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.id) {
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
    });

    if (membership) {
      redirect("/dashboard");
    }

    redirect("/setup");
  }

  return (
    <div className="landing-theme min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <ProblemSolution />
        <Features />
        <HowItWorks />
        <Showcase />
        <Testimonials />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
