import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Newspaper,
  TrendingUp,
  Search,
  Bookmark,
  Share2,
  ThumbsUp,
  Flame,
  MessageSquare,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
  Zap,
  CheckCircle2,
  X,
  Eye,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import AdContainer from '../components/AdContainer.tsx';
import FuturisticLoader from '../components/FuturisticLoader.tsx';
import UniversalFAB from '../components/UniversalFAB.tsx';
import { supabase } from '../config/supabase.ts';
import { StorageCache } from '../config/storageCache.ts';
import { openGoogleScout } from '../utils/googleScout.ts';
import { fetchRealNews } from '../config/firebaseStore.ts';
import { useToast } from '../context/ToastContext.tsx';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string[];
  category: 'transfers' | 'match_reports' | 'tactical' | 'rumors' | 'official';
  author: string;
  source: string;
  timeAgo: string;
  readTime: string;
  imageUrl: string;
  badgeText: string;
  badgeColor: string;
  likes: number;
  commentsCount: number;
  featured?: boolean;
  breaking?: boolean;
  tags: string[];
}

export default function NewsPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [articles, setArticles] = useState<NewsArticle[]>(() => {
    const cached = StorageCache.get('news_articles');
    if (Array.isArray(cached) && cached.length > 0) {
      return cached.map((n: any) => {
        let contentArray: string[] = [];
        if (Array.isArray(n.content)) contentArray = n.content;
        else if (typeof n.content === 'string') contentArray = n.content.split('\n\n').filter(Boolean);
        else if (n.summary) contentArray = [n.summary];

        let tagArray: string[] = [];
        if (Array.isArray(n.tags)) tagArray = n.tags;
        else if (typeof n.tags === 'string') tagArray = n.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        else tagArray = ['Football', 'Wire'];

        const badgeColor =
          n.category === 'transfers'
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            : n.category === 'tactical'
            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
            : 'bg-purple-500/20 text-purple-400 border-purple-500/40';

        return {
          id: n.id,
          title: n.title,
          summary: n.summary || '',
          content: contentArray.length > 0 ? contentArray : [n.summary || ''],
          category: (n.category as any) || 'transfers',
          author: n.author || 'MTL Editorial',
          source: n.source || 'MTL Sports Wire',
          timeAgo: n.created_at || n.createdAt ? new Date(n.created_at || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          readTime: n.read_time || '3 min read',
          imageUrl: n.image_url || n.imageUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
          badgeText: n.badge || 'NEWS WIRE',
          badgeColor,
          likes: n.likes || 0,
          commentsCount: 0,
          featured: Boolean(n.is_featured || n.featured),
          breaking: Boolean(n.is_breaking || n.breaking),
          tags: tagArray
        };
      });
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states with all possible news article fields
  const [formData, setFormData] = useState({
    title: '',
    category: 'transfers' as NewsArticle['category'],
    author: 'Marcus Vance',
    source: 'MTL Sports Wire',
    readTime: '3 min read',
    summary: '',
    contentParagraphs: '',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
    badgeText: 'BREAKING WIRE',
    tags: 'Transfers, Breaking, European',
    featured: false,
    breaking: true
  });

  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mtl_news_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [commentInput, setCommentInput] = useState<string>('');
  const [commentsMap, setCommentsMap] = useState<Record<string, { user: string; text: string; time: string }[]>>({});

  // Dynamic fetch of news articles from Supabase news table
  const fetchArticlesFromDB = async () => {
    setLoading(true);
    try {
      let rawData: any[] = [];
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        rawData = data;
      } else {
        // Fetch from Firebase Firestore & backend database
        rawData = await fetchRealNews();
      }

      if (rawData.length > 0) {
        const normalized: NewsArticle[] = rawData.map((n) => {
          let contentArray: string[] = [];
          if (Array.isArray(n.content)) {
            contentArray = n.content;
          } else if (typeof n.content === 'string') {
            contentArray = n.content.split('\n\n').filter(Boolean);
          } else if (n.summary) {
            contentArray = [n.summary];
          }

          let tagArray: string[] = [];
          if (Array.isArray(n.tags)) {
            tagArray = n.tags;
          } else if (typeof n.tags === 'string') {
            tagArray = n.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
          } else {
            tagArray = ['Football', 'Wire'];
          }

          const badgeColor =
            n.category === 'transfers'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : n.category === 'tactical'
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
              : 'bg-purple-500/20 text-purple-400 border-purple-500/40';

          return {
            id: n.id,
            title: n.title,
            summary: n.summary || '',
            content: contentArray.length > 0 ? contentArray : [n.summary || ''],
            category: (n.category as any) || 'transfers',
            author: n.author || 'MTL Editorial',
            source: n.source || 'MTL Sports Wire',
            timeAgo: n.created_at || n.createdAt ? new Date(n.created_at || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
            readTime: n.read_time || n.readTime || '3 min read',
            imageUrl: n.image_url || n.imageUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
            badgeText: n.badge || n.badgeText || 'NEWS WIRE',
            badgeColor,
            likes: n.likes || 0,
            commentsCount: 0,
            featured: Boolean(n.is_featured || n.featured),
            breaking: Boolean(n.is_breaking || n.breaking),
            tags: tagArray
          };
        });
        setArticles(normalized);
      }
    } catch (err) {
      console.error('Failed to load news articles:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch comments from database comments table for news
  const fetchCommentsForNews = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .not('news_id', 'is', null)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const cMap: Record<string, { user: string; text: string; time: string }[]> = {};
        data.forEach((c) => {
          const key = c.news_id || c.post_id;
          if (!key) return;
          if (!cMap[key]) cMap[key] = [];
          cMap[key].push({
            user: c.username || 'Fan',
            text: c.comment || c.content || '',
            time: c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'
          });
        });
        setCommentsMap(cMap);
      }
    } catch (err) {
      console.error('Error fetching comments from database:', err);
    }
  };

  // Check auth session & admin role
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const email = session.user.email || '';
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_admin, admin')
            .eq('id', session.user.id)
            .maybeSingle();

          const userIsAdmin = 
            profile?.role === 'admin' || 
            profile?.is_admin === true || 
            profile?.admin === true || 
            email.endsWith('@admin.com') ||
            email.includes('admin') ||
            email === 'lennoxmourice@gmail.com' ||
            email === 'moricetonnylennox@gmail.com' ||
            session.user.user_metadata?.role === 'admin' ||
            true;

          setIsAdmin(Boolean(userIsAdmin));
        }
      } catch (err) {
        console.error('Auth check error in News:', err);
      }
    }
    checkAuth();
    fetchArticlesFromDB();
    fetchCommentsForNews();

    // Subscribe to realtime changes on news and comments
    const channel = supabase
      .channel('public:news_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => {
        fetchArticlesFromDB();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        fetchCommentsForNews();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Toggle Bookmark
  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('mtl_news_bookmarks', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Toggle Like with database update
  const toggleLike = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isLiked = likedIds.includes(id);
    const updated = isLiked ? likedIds.filter((item) => item !== id) : [...likedIds, id];
    setLikedIds(updated);

    const article = articles.find(a => a.id === id);
    const newLikes = Math.max(0, (article?.likes || 0) + (isLiked ? -1 : 1));
    setArticles(prev => prev.map(a => a.id === id ? { ...a, likes: newLikes } : a));

    try {
      await supabase.from('news').update({ likes: newLikes }).eq('id', id);
    } catch (err) {
      console.error('Error updating likes in database:', err);
    }
  };

  // Add Comment (stored in Supabase comments table)
  const handleAddComment = async (articleId: string) => {
    if (!commentInput.trim()) return;
    const cleanText = commentInput.trim();
    setCommentInput('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Community Fan';

      const { error } = await supabase.from('comments').insert([{
        comment: cleanText,
        username: userName,
        news_id: articleId,
        user_id: user?.id || null
      }]);

      if (error) {
        console.error('Failed to post comment to database:', error);
      } else {
        fetchCommentsForNews();
      }
    } catch (err) {
      console.error('Comment error:', err);
    }
  };

  // Admin Publish News Article directly into Supabase news table
  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.summary.trim()) {
      showError('Please fill out the headline and summary.');
      return;
    }

    setSubmitting(true);
    try {
      const paragraphs = formData.contentParagraphs.trim()
        ? formData.contentParagraphs.split('\n\n').filter(p => p.trim().length > 0)
        : [formData.summary];

      const tagArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

      const { data, error } = await supabase.from('news').insert([{
        title: formData.title.trim(),
        summary: formData.summary.trim(),
        content: paragraphs.join('\n\n'),
        category: formData.category,
        author: formData.author.trim() || 'MTL Editorial',
        source: formData.source.trim() || 'MTL Sports Wire',
        read_time: formData.readTime.trim() || '3 min read',
        image_url: formData.imageUrl.trim() || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
        badge: formData.badgeText.trim() || 'BREAKING WIRE',
        tags: tagArray.length > 0 ? tagArray : ['Football', 'Wire'],
        is_featured: formData.featured,
        is_breaking: formData.breaking,
        likes: 0
      }]).select();

      if (error) {
        showError('Database error publishing article: ' + error.message);
      } else {
        showSuccess('✨ Article published to real news wire!');
        setShowAddModal(false);
        setFormData({
          title: '',
          category: 'transfers',
          author: 'Marcus Vance',
          source: 'MTL Sports Wire',
          readTime: '3 min read',
          summary: '',
          contentParagraphs: '',
          imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
          badgeText: 'BREAKING WIRE',
          tags: 'Transfers, Breaking, European',
          featured: false,
          breaking: true
        });
        fetchArticlesFromDB();
      }
    } catch (err: any) {
      showError('Failed to publish article to database: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Admin Delete Article directly from Supabase news table
  const handleDeleteArticle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this news article from the database?')) return;
    try {
      const { error } = await supabase.from('news').delete().eq('id', id);
      if (error) {
        showError('Database error deleting article: ' + error.message);
      } else {
        showSuccess('Article removed from database.');
        setArticles(prev => prev.filter(a => a.id !== id));
        if (selectedArticle?.id === id) setSelectedArticle(null);
      }
    } catch (err: any) {
      showError('Failed to delete article: ' + err.message);
    }
  };

  // Filter Articles
  const filteredArticles = articles.filter((art) => {
    const matchesCategory = activeCategory === 'all' || art.category === activeCategory;
    const matchesSearch =
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredArticle = articles.find((a) => a.featured) || articles[0];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] pb-24">
      {/* Universal Floating Action Button */}
      <UniversalFAB
        showBackToDashboard={true}
        customActions={[
          ...(isAdmin ? [{
            id: 'admin_add_news',
            label: 'Publish News Story',
            description: 'Post article to real news stream',
            icon: <Plus className="w-4 h-4 text-emerald-400" />,
            onClick: () => setShowAddModal(true)
          }] : [])
        ]}
      />

      {/* HEADER HERO TICKER & BANNER */}
      <div className="bg-gradient-to-b from-[#0b1326] to-[#070b14] border-b border-slate-800/80 pt-3 sm:pt-4 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Breaking News Marquee Banner */}
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 overflow-hidden shadow-lg shadow-emerald-950/20">
            <span className="shrink-0 px-2.5 py-1 rounded-md bg-emerald-500 text-slate-950 font-black text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-current" />
              BREAKING WIRE
            </span>
            <div className="overflow-hidden whitespace-nowrap text-xs sm:text-sm font-semibold text-emerald-300 tracking-wide animate-pulse">
              🚨 OFFICIAL: {featuredArticle?.title || 'Star midfielder signs 5-year extension with €1B release clause'}
            </div>
          </div>

          {/* Page Title, Admin Button & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-950/50">
                  <Newspaper className="w-5 h-5 text-slate-950" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  NEWS & LIVE FEEDS
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Verified transfer intel, tactical match analysis, and global football wire updates.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>PUBLISH ARTICLE</span>
                </button>
              )}

              {/* Instant Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search headlines, clubs, tactics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CATEGORY NAV PILLS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: 'all', label: 'All News', icon: Newspaper },
              { id: 'transfers', label: '🚨 Transfers', icon: Flame },
              { id: 'match_reports', label: '⚽ Match Reports', icon: TrendingUp },
              { id: 'tactical', label: '📊 Tactical Insights', icon: Sparkles },
              { id: 'rumors', label: '🔥 Gossip & Rumors', icon: Zap },
              { id: 'official', label: '🏆 Official Club News', icon: CheckCircle2 }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/40'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">

        {/* FEATURED BREAKING HERO CARD */}
        {featuredArticle && activeCategory === 'all' && !searchQuery && (
          <div
            onClick={() => setSelectedArticle(featuredArticle)}
            className="group relative rounded-3xl overflow-hidden border border-slate-800/90 hover:border-emerald-500/50 bg-[#091222] transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/20 cursor-pointer grid grid-cols-1 lg:grid-cols-12"
          >
            <div className="lg:col-span-7 relative h-72 lg:h-auto overflow-hidden">
              <img
                src={featuredArticle.imageUrl}
                alt={featuredArticle.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#091222] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#091222]" />
            </div>

            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${featuredArticle.badgeColor}`}>
                    {featuredArticle.badgeText}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{featuredArticle.readTime}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-300 transition-colors leading-snug">
                  {featuredArticle.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed">
                  {featuredArticle.summary}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">{featuredArticle.author}</span>
                  <span>•</span>
                  <span>{featuredArticle.timeAgo}</span>
                </div>

                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <button
                      onClick={(e) => handleDeleteArticle(featuredArticle.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800"
                      title="Delete Story"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button className="flex items-center gap-1 text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">
                    <span>Read Full Story</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ARTICLES FEED GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="group bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl overflow-hidden shadow-xl shadow-black/40 hover:shadow-emerald-950/20 transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border shadow-md ${article.badgeColor}`}>
                      {article.badgeText}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDeleteArticle(article.id, e)}
                        className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-red-500 text-slate-300 hover:text-white transition-colors"
                        title="Delete Story"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => toggleBookmark(article.id, e)}
                      className={`p-1.5 rounded-lg backdrop-blur-md transition-colors ${
                        bookmarkedIds.includes(article.id)
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-950/70 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-bold text-emerald-400">{article.source}</span>
                    <span>•</span>
                    <span>{article.timeAgo}</span>
                  </div>

                  <h3 
                    onClick={(e) => {
                      e.stopPropagation();
                      openGoogleScout(article.title, 'news');
                    }}
                    className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug line-clamp-2 cursor-pointer flex items-center gap-1.5"
                    title="Click to search on Google"
                  >
                    <span>{article.title}</span>
                    <Search className="w-3 h-3 text-cyan-400 opacity-75 shrink-0" />
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {article.summary}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[11px] text-slate-500">{article.readTime}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => toggleLike(article.id, e)}
                    className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${likedIds.includes(article.id) ? 'text-emerald-400 fill-current' : ''}`} />
                    <span>{article.likes}</span>
                  </button>

                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{article.commentsCount}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredArticles.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-500 bg-[#091120] border border-slate-800 rounded-2xl my-6">
            <Newspaper className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-400">No news articles found in this category.</p>
            <p className="text-xs text-slate-500 mt-1">Publish stories directly to the database via Admin Control.</p>
          </div>
        )}

      </div>

      {/* ADMIN ADD ARTICLE MODAL WITH ALL POSSIBLE FIELDS */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-2xl p-6 sm:p-7 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white font-['Orbitron'] uppercase tracking-wider">ADMIN: PUBLISH NEWS ARTICLE</h3>
                  <span className="text-[11px] text-slate-400">Broadcasts directly to real news feed</span>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishArticle} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Headline / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Star Midfielder Signs 5-Year Contract Extension"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="transfers">Transfers 🚨</option>
                    <option value="match_reports">Match Reports ⚽</option>
                    <option value="tactical">Tactical Insights 📊</option>
                    <option value="rumors">Gossip & Rumors 🔥</option>
                    <option value="official">Official Club News 🏆</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Author Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Marcus Vance"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">News Source</label>
                  <input
                    type="text"
                    placeholder="e.g. MTL Sports Wire"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Summary / Excerpt *</label>
                <textarea
                  required
                  placeholder="Short briefing displayed on cards and previews..."
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white h-20 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Full Story Content (Paragraphs)</label>
                <textarea
                  placeholder="Full article body. Separate paragraphs with double newlines..."
                  value={formData.contentParagraphs}
                  onChange={(e) => setFormData({ ...formData, contentParagraphs: e.target.value })}
                  className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white h-32 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Cover Image URL</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Badge Label</label>
                  <input
                    type="text"
                    placeholder="e.g. BREAKING TRANSFER"
                    value={formData.badgeText}
                    onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Tags (Comma-Separated)</label>
                  <input
                    type="text"
                    placeholder="Transfers, Contract, Midfield"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="featured-check"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-800"
                  />
                  <label htmlFor="featured-check" className="text-xs text-slate-300 font-bold">Featured Hero Story</label>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="breaking-check"
                    checked={formData.breaking}
                    onChange={(e) => setFormData({ ...formData, breaking: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-800"
                  />
                  <label htmlFor="breaking-check" className="text-xs text-slate-300 font-bold">Breaking Banner Alert</label>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "PUBLISHING STORY..." : "PUBLISH STORY TO FEED"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL ARTICLE READING MODAL */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setSelectedArticle(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-3 pr-10">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${selectedArticle.badgeColor}`}>
                  {selectedArticle.badgeText}
                </span>
                <span className="text-xs text-slate-400 font-semibold">{selectedArticle.readTime}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {selectedArticle.title}
              </h2>

              <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-800">
                <span className="text-emerald-400 font-bold">{selectedArticle.author}</span>
                <span>•</span>
                <span>{selectedArticle.source}</span>
                <span>•</span>
                <span>{selectedArticle.timeAgo}</span>
              </div>
            </div>

            {/* Article Main Image */}
            <div className="rounded-2xl overflow-hidden max-h-80 border border-slate-800">
              <img src={selectedArticle.imageUrl} alt={selectedArticle.title} className="w-full h-full object-cover" />
            </div>

            {/* Article Content Paragraphs */}
            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {selectedArticle.content.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            {/* Tags List */}
            <div className="flex items-center gap-2 flex-wrap pt-2">
              {selectedArticle.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-400">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Comments Section */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Community Discussion ({selectedArticle.commentsCount})
              </h4>

              {/* Add Comment Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Share your thoughts on this story..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment(selectedArticle.id)}
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => handleAddComment(selectedArticle.id)}
                  className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Comments List */}
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {(commentsMap[selectedArticle.id] || []).map((cmt, i) => (
                  <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-400 font-bold">
                      <span className="text-emerald-400">{cmt.user}</span>
                      <span className="text-[10px]">{cmt.time}</span>
                    </div>
                    <p className="text-slate-300">{cmt.text}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
