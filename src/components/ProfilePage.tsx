import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Camera, Save, X, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, Profile } from "@/hooks/useAuth";

interface ProfilePageProps {
  onClose: () => void;
}

export function ProfilePage({ onClose }: ProfilePageProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: profile?.username ?? "",
    display_name: profile?.display_name ?? "",
    bio: profile?.bio ?? "",
  });
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ watched: 0, wantToWatch: 0, avgRating: 0 });

  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      const { data } = await supabase
        .from("watched_movies")
        .select("has_watched, user_rating")
        .eq("user_id", user.id);
      
      if (data) {
        let watched = 0;
        let wantToWatch = 0;
        let totalRating = 0;
        let ratedCount = 0;
        
        data.forEach((m) => {
          if (m.has_watched) {
            watched++;
            if (m.user_rating > 0) {
              totalRating += m.user_rating;
              ratedCount++;
            }
          } else {
            wantToWatch++;
          }
        });
        
        setStats({
          watched,
          wantToWatch,
          avgRating: ratedCount ? (totalRating / ratedCount) : 0,
        });
      }
    }
    loadStats();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");

    // Check username uniqueness if changed
    if (form.username && form.username !== profile?.username) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", form.username.toLowerCase())
        .neq("id", user.id)
        .maybeSingle();
      if (existing) {
        setError("This username is already taken.");
        setSaving(false);
        return;
      }
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        username: form.username.toLowerCase() || null,
        display_name: form.display_name || null,
        bio: form.bio || null,
      })
      .eq("id", user.id);

    if (updateErr) {
      setError(updateErr.message);
    } else {
      await refreshProfile();
      setEditing(false);
    }
    setSaving(false);
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = profile?.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.25 }}
        className="bg-card border border-border rounded-2xl w-full max-w-md relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header banner */}
        <div className="h-24 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-background/60 backdrop-blur-sm text-foreground hover:bg-background transition-colors"
        >
          <X size={16} />
        </button>

        {/* Avatar */}
        <div className="px-6 pb-6">
          <div className="-mt-12 mb-4 flex items-end justify-between">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-4 border-card overflow-hidden bg-primary/10 flex items-center justify-center shadow-lg">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary">{initials}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <Camera size={12} className="text-primary-foreground" />
              </div>
            </div>
            {!editing && (
              <button
                onClick={() => {
                  setForm({
                    username: profile?.username ?? "",
                    display_name: profile?.display_name ?? "",
                    bio: profile?.bio ?? "",
                  });
                  setEditing(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-foreground hover:bg-secondary transition-colors"
              >
                <Edit2 size={12} /> Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                  placeholder="Your name"
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value.replace(/\s/g, "") }))}
                    placeholder="username"
                    className="w-full bg-muted border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setEditing(false); setError(""); }}
                  className="flex-1 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Save size={14} />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
                {profile?.username && (
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                )}
              </div>
              {profile?.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
              )}
              <div className="pt-2 border-t border-border mt-3">
                <p className="text-xs text-muted-foreground mb-4">
                  Signed in as <span className="text-foreground">{user?.email}</span>
                </p>
                
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-muted p-3 rounded-xl text-center">
                    <div className="text-2xl font-bold text-foreground">{stats.watched}</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-80">Watched</div>
                  </div>
                  <div className="bg-muted p-3 rounded-xl text-center">
                    <div className="text-2xl font-bold text-foreground">{stats.wantToWatch}</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-80">Watchlist</div>
                  </div>
                  <div className="bg-muted p-3 rounded-xl text-center">
                    <div className="text-2xl font-bold text-primary">{stats.avgRating.toFixed(1)}</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-80">Avg Rating</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
