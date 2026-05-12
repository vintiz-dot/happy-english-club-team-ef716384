import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { StudentNavBar } from "@/components/student/StudentNavBar";
import { Gamepad2, Sparkles } from "lucide-react";

export default function StudentGames() {
  return (
    <Layout>
      <StudentNavBar />
      <div className="container mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto glass-lg border-0 shadow-xl rounded-3xl p-10 text-center bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10"
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-primary/15 mb-6"
          >
            <Gamepad2 className="h-12 w-12 text-primary" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3 flex items-center justify-center gap-2">
            Games <Sparkles className="h-6 w-6 text-accent" />
          </h1>
          <p className="text-lg text-muted-foreground mb-2 font-semibold">Coming soon!</p>
          <p className="text-sm text-muted-foreground">
            We're building fun mini-games to help you learn English. Check back soon!
          </p>
        </motion.div>
      </div>
    </Layout>
  );
}
