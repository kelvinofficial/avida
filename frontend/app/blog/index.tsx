import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { DesktopHeader } from '../../src/components/layout/DesktopHeader';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meta_description: string;
  category: string;
  target_country: string;
  language: string;
  word_count: number;
  reading_time: number;
  status: string;
  created_at: string;
  published_at?: string;
  featured_image?: string;
}

// Category labels with colors
const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  vehicles: { label: 'Vehicles', color: '#3B82F6', bg: '#DBEAFE' },
  electronics: { label: 'Electronics', color: '#0EA5E9', bg: '#E0F2FE' },
  properties: { label: 'Properties', color: '#8B5CF6', bg: '#EDE9FE' },
  general: { label: 'General', color: '#6B7280', bg: '#F3F4F6' },
  safety: { label: 'Safety Tips', color: '#10B981', bg: '#D1FAE5' },
  buying_guide: { label: 'Buying Guide', color: '#F59E0B', bg: '#FEF3C7' },
};

// Country flags
const COUNTRY_FLAGS: Record<string, string> = {
  TZ: '🇹🇿',
  KE: '🇰🇪',
  DE: '🇩🇪',
  UG: '🇺🇬',
  NG: '🇳🇬',
  ZA: '🇿🇦',
};

export default function BlogIndexPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, selectedCountry]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE}/api/growth/content/posts?status=published&limit=50`;
      if (selectedCategory) url += `&category=${selectedCategory}`;
      if (selectedCountry) url += `&country=${selectedCountry}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(query) ||
      post.excerpt?.toLowerCase().includes(query) ||
      post.meta_description?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORY_LABELS[category] || CATEGORY_LABELS.general;
  };

  const renderBlogCard = (post: BlogPost, featured = false) => {
    const categoryInfo = getCategoryInfo(post.category);
    const countryFlag = COUNTRY_FLAGS[post.target_country] || '';
    
    return (
      <TouchableOpacity
        key={post.id}
        style={[
          styles.blogCard,
          featured && styles.featuredCard,
          isDesktop && styles.blogCardDesktop,
        ]}
        onPress={() => router.push(`/blog/${post.slug}`)}
        data-testid={`blog-card-${post.slug}`}
      >
        {/* Featured Image Placeholder */}
        <View style={[styles.imageContainer, featured && styles.featuredImageContainer]}>
          {post.featured_image ? (
            <Image source={{ uri: post.featured_image }} style={styles.image} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: categoryInfo.bg }]}>
              <Ionicons name="newspaper-outline" size={featured ? 48 : 32} color={categoryInfo.color} />
            </View>
          )}
          {/* Category Badge */}
          <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.bg }]}>
            <Text style={[styles.categoryBadgeText, { color: categoryInfo.color }]}>
              {categoryInfo.label}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          {/* Meta Info */}
          <View style={styles.metaRow}>
            <Text style={styles.countryFlag}>{countryFlag}</Text>
            <Text style={styles.metaText}>{formatDate(post.published_at || post.created_at)}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{post.reading_time} min read</Text>
          </View>
          
          {/* Title */}
          <Text style={[styles.title, featured && styles.featuredTitle]} numberOfLines={featured ? 3 : 2}>
            {post.title}
          </Text>
          
          {/* Excerpt */}
          <Text style={styles.excerpt} numberOfLines={featured ? 4 : 2}>
            {post.excerpt || post.meta_description}
          </Text>
          
          {/* Read More */}
          <View style={styles.readMoreRow}>
            <Text style={styles.readMoreText}>Read More</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const categories = Object.entries(CATEGORY_LABELS);
  const countries = Object.entries(COUNTRY_FLAGS);

  return (
    <View style={styles.container}>
      {isDesktop && <DesktopHeader />}
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Avida Blog</Text>
            <Text style={styles.heroSubtitle}>
              Tips, guides, and insights for buying and selling safely in Africa & Germany
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={[styles.mainContent, isDesktop && styles.mainContentDesktop]}>
          {/* Filters Section */}
          <View style={styles.filtersSection}>
            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={theme.colors.onSurfaceVariant} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search articles..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={searchQuery}
                onChangeText={setSearchQuery}
                data-testid="blog-search-input"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Category Filter */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.filterScroll}
              contentContainerStyle={styles.filterScrollContent}
            >
              <TouchableOpacity
                style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>
                  All Topics
                </Text>
              </TouchableOpacity>
              {categories.map(([key, info]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filterChip,
                    selectedCategory === key && styles.filterChipActive,
                    selectedCategory === key && { backgroundColor: info.bg }
                  ]}
                  onPress={() => setSelectedCategory(selectedCategory === key ? null : key)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedCategory === key && { color: info.color }
                  ]}>
                    {info.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Country Filter */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.filterScroll}
              contentContainerStyle={styles.filterScrollContent}
            >
              <TouchableOpacity
                style={[styles.filterChip, !selectedCountry && styles.filterChipActive]}
                onPress={() => setSelectedCountry(null)}
              >
                <Text style={[styles.filterChipText, !selectedCountry && styles.filterChipTextActive]}>
                  All Regions
                </Text>
              </TouchableOpacity>
              {countries.map(([code, flag]) => (
                <TouchableOpacity
                  key={code}
                  style={[styles.filterChip, selectedCountry === code && styles.filterChipActive]}
                  onPress={() => setSelectedCountry(selectedCountry === code ? null : code)}
                >
                  <Text style={styles.filterChipText}>{flag} {code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Blog Posts Grid */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading articles...</Text>
            </View>
          ) : filteredPosts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={64} color={theme.colors.outline} />
              <Text style={styles.emptyTitle}>No Articles Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? 'Try adjusting your search or filters'
                  : 'Check back soon for new content!'}
              </Text>
            </View>
          ) : (
            <View style={[styles.postsGrid, isDesktop && styles.postsGridDesktop]}>
              {/* Featured Post (first post) */}
              {filteredPosts.length > 0 && renderBlogCard(filteredPosts[0], true)}
              
              {/* Regular Posts */}
              <View style={[styles.regularPosts, isDesktop && styles.regularPostsDesktop]}>
                {filteredPosts.slice(1).map(post => renderBlogCard(post))}
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} Avida Marketplace. Safe buying and selling.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  
  // Hero Section
  heroSection: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  heroSectionDesktop: {
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  heroContent: {
    maxWidth: 800,
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 26,
  },

  // Main Content
  mainContent: {
    flex: 1,
    padding: 16,
  },
  mainContentDesktop: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    padding: 32,
  },

  // Filters
  filtersSection: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterScrollContent: {
    paddingRight: 16,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Posts Grid
  postsGrid: {
    gap: 24,
  },
  postsGridDesktop: {
    gap: 32,
  },
  regularPosts: {
    gap: 16,
  },
  regularPostsDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },

  // Blog Card
  blogCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  blogCardDesktop: {
    width: 'calc(33.333% - 16px)',
    minWidth: 300,
  },
  featuredCard: {
    width: '100%',
  },
  imageContainer: {
    height: 180,
    position: 'relative',
  },
  featuredImageContainer: {
    height: 280,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  countryFlag: {
    fontSize: 14,
    marginRight: 8,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  metaDot: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginHorizontal: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 8,
    lineHeight: 24,
  },
  featuredTitle: {
    fontSize: 24,
    lineHeight: 32,
  },
  excerpt: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 12,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  // Loading & Empty States
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },

  // Footer
  footer: {
    backgroundColor: theme.colors.inverseSurface,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.inverseOnSurface,
  },
});
