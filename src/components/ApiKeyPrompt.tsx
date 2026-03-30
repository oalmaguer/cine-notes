import { useState } from "react";
import { Key } from "lucide-react";
import { motion } from "framer-motion";

interface ApiKeyPromptProps {
  onSave: (key: string) => void;
}

export function ApiKeyPrompt({ onSave }: ApiKeyPromptProps) {
  const [key, setKey] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto bg-card border border-border rounded-2xl p-8 text-center space-y-5"
    >
      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
        <Key className="text-primary" size={24} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">TMDB API Key Required</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Get a free API key at{" "}
          <a
            href="https://www.themoviedb.org/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            themoviedb.org
          </a>
        </p>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste your API key..."
          className="flex-1 bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
        <button
          onClick={() => key.trim() && onSave(key.trim())}
          disabled={!key.trim()}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          Save
        </button>
      </div>
    </motion.div>
  );
}
