import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { DesktopHeader } from '../../src/components/layout/DesktopHeader';
import { getCachedSync, setCacheSync } from '../../src/utils/cacheManager';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meta_title: string;
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
  faq_section?: Array<{ question: string; answer: string }>;
  internal_links?: Array<{ type: string; url: string; anchor_text: string }>;
  keywords?: string[];
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  reading_time: number;
}

// Category labels
const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  vehicles: { label: 'Vehicles', color: '#3B82F6', bg: '#DBEAFE' },
  electronics: { label: 'Electronics', color: '#0EA5E9', bg: '#E0F2FE' },
  properties: { label: 'Properties', color: '#8B5CF6', bg: '#EDE9FE' },
  general: { label: 'General', color: '#6B7280', bg: '#F3F4F6' },
  safety: { label: 'Safety Tips', color: '#10B981', bg: '#D1FAE5' },
  buying_guide: { label: 'Buying Guide', color: '#F59E0B', bg: '#FEF3C7' },
};

// Country info
const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  TZ: { name: 'Tanzania', flag: '🇹🇿' },
  KE: { name: 'Kenya', flag: '🇰🇪' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  UG: { name: 'Uganda', flag: '🇺🇬' },
  NG: { name: 'Nigeria', flag: '🇳🇬' },
  ZA: { name: 'South Africa', flag: '🇿🇦' },
};

export default function BlogPostPage() {
  const router = useRouter();
  const { slug } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  
  // Cache key for blog post
  const BLOG_POST_CACHE_KEY = `blog_post_${slug}`;
  
  // Cache-first: Initialize with cached data for instant render
  const cachedPost = getCachedSync<BlogPost>(BLOG_POST_CACHE_KEY);
  
  const [post, setPost] = useState<BlogPost | null>(cachedPost);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [isFetchingInBackground, setIsFetchingInBackground] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    try {
      setIsFetchingInBackground(true);
      setError(null);
      
      const res = await fetch(`${API_BASE}/api/growth/content/posts/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data);
        setCacheSync(BLOG_POST_CACHE_KEY, data);
        
        // Update page title for SEO (web only)
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          document.title = `${data.meta_title || data.title} | Avida Blog`;
          
          // Update meta description
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            metaDesc.setAttribute('content', data.meta_description || data.excerpt);
          }
        }
        
        // Fetch related posts
        fetchRelatedPosts(data.category);
      } else {
        if (!cachedPost) setError('Article not found');
      }
    } catch (err) {
      console.error('Failed to fetch blog post:', err);
      if (!cachedPost) setError('Failed to load article');
    } finally {
      setIsFetchingInBackground(false);
    }
  }, [slug, BLOG_POST_CACHE_KEY, cachedPost]);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug, fetchPost]);

  const fetchRelatedPosts = async (category: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/growth/content/posts?category=${category}&limit=4&status=published`);
      if (res.ok) {
        const data = await res.json();
        // Filter out current post
        const filtered = (data.posts || []).filter((p: RelatedPost) => p.slug !== slug);
        setRelatedPosts(filtered.slice(0, 3));
      }
    } catch (err) {
      console.error('Failed to fetch related posts:', err);
    }
  };

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

  const getCountryInfo = (code: string) => {
    return COUNTRY_INFO[code] || { name: code, flag: '' };
  };

  // Render markdown-like content
  const renderContent = (content: string) => {
    if (!content) return null;
    
    // Split content by lines
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let inList = false;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Check for headers
      if (trimmedLine.startsWith('## ')) {
        // Flush any pending list
        if (inList && listItems.length > 0) {
          elements.push(
            <View key={`list-${index}`} style={styles.bulletList}>
              {listItems.map((item, i) => (
                <View key={i} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          );
          listItems = [];
          inList = false;
        }
        
        elements.push(
          <Text key={index} style={styles.h2}>
            {trimmedLine.replace('## ', '')}
          </Text>
        );
      } else if (trimmedLine.startsWith('### ')) {
        elements.push(
          <Text key={index} style={styles.h3}>
            {trimmedLine.replace('### ', '')}
          </Text>
        );
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        inList = true;
        listItems.push(trimmedLine.replace(/^[-*]\s+/, ''));
      } else if (trimmedLine.startsWith('---')) {
        // Flush list
        if (inList && listItems.length > 0) {
          elements.push(
            <View key={`list-${index}`} style={styles.bulletList}>
              {listItems.map((item, i) => (
                <View key={i} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          );
          listItems = [];
          inList = false;
        }
        elements.push(<View key={index} style={styles.divider} />);
      } else if (trimmedLine) {
        // Flush list
        if (inList && listItems.length > 0) {
          elements.push(
            <View key={`list-${index}`} style={styles.bulletList}>
              {listItems.map((item, i) => (
                <View key={i} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          );
          listItems = [];
          inList = false;
        }
        
        // Process bold text (**text**)
        const parts = trimmedLine.split(/(\*\*[^*]+\*\*)/);
        const textElements = parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>;
          }
          return part;
        });
        
        elements.push(
          <Text key={index} style={styles.paragraph}>
            {textElements}
          </Text>
        );
      }
    });
    
    // Flush any remaining list
    if (inList && listItems.length > 0) {
      elements.push(
        <View key={`list-final`} style={styles.bulletList}>
          {listItems.map((item, i) => (
            <View key={i} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    }
    
    return elements;
  };

  if (error || !post) {
    return (
      <View style={styles.container}>
        {isDesktop && <DesktopHeader />}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Article Not Found</Text>
          <Text style={styles.errorSubtitle}>{error || 'The article you\'re looking for doesn\'t exist.'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/blog')}>
            <Text style={styles.backButtonText}>Back to Blog</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const categoryInfo = getCategoryInfo(post.category);
  const countryInfo = getCountryInfo(post.target_country);

  return (
    <View style={styles.container}>
      {isDesktop && <DesktopHeader />}
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Article Header */}
        <View style={[styles.articleHeader, isDesktop && styles.articleHeaderDesktop]}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backLink} 
            onPress={() => router.push('/blog')}
            data-testid="back-to-blog"
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
            <Text style={styles.backLinkText}>Back to Blog</Text>
          </TouchableOpacity>
          
          {/* Category & Country */}
          <View style={styles.metaTagsRow}>
            <View style={[styles.categoryTag, { backgroundColor: categoryInfo.bg }]}>
              <Text style={[styles.categoryTagText, { color: categoryInfo.color }]}>
                {categoryInfo.label}
              </Text>
            </View>
            <View style={styles.countryTag}>
              <Text style={styles.countryText}>{countryInfo.flag} {countryInfo.name}</Text>
            </View>
          </View>
          
          {/* Title */}
          <Text style={styles.articleTitle}>{post.title}</Text>
          
          {/* Meta Info */}
          <View style={styles.articleMeta}>
            <Text style={styles.metaText}>
              {formatDate(post.published_at || post.created_at)}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{post.reading_time} min read</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{post.word_count} words</Text>
          </View>
        </View>

        {/* Article Content */}
        <View style={[styles.articleContent, isDesktop && styles.articleContentDesktop]}>
          <View style={styles.contentBody}>
            {renderContent(post.content)}
          </View>
          
          {/* FAQ Section */}
          {post.faq_section && post.faq_section.length > 0 && (
            <View style={styles.faqSection}>
              <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
              {post.faq_section.map((faq, index) => (
                <View key={index} style={styles.faqItem}>
                  <View style={styles.faqQuestion}>
                    <Ionicons name="help-circle" size={20} color={theme.colors.primary} />
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                  </View>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </View>
              ))}
            </View>
          )}
          
          {/* Keywords/Tags */}
          {post.keywords && post.keywords.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.tagsTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {post.keywords.map((keyword, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{keyword}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Internal Links / Related Listings */}
          {post.internal_links && post.internal_links.length > 0 && (
            <View style={styles.internalLinksSection}>
              <Text style={styles.internalLinksTitle}>Related on Avida</Text>
              {post.internal_links.map((link, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.internalLink}
                  onPress={() => router.push(link.url as any)}
                >
                  <Ionicons 
                    name={link.type === 'listing' ? 'pricetag' : 'newspaper'} 
                    size={16} 
                    color={theme.colors.primary} 
                  />
                  <Text style={styles.internalLinkText}>{link.anchor_text}</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <View style={[styles.relatedSection, isDesktop && styles.relatedSectionDesktop]}>
            <Text style={styles.relatedTitle}>Related Articles</Text>
            <View style={[styles.relatedGrid, isDesktop && styles.relatedGridDesktop]}>
              {relatedPosts.map((relPost) => (
                <TouchableOpacity
                  key={relPost.id}
                  style={[styles.relatedCard, isDesktop && styles.relatedCardDesktop]}
                  onPress={() => router.push(`/blog/${relPost.slug}`)}
                >
                  <View style={[styles.relatedImagePlaceholder, { backgroundColor: getCategoryInfo(relPost.category).bg }]}>
                    <Ionicons name="newspaper-outline" size={24} color={getCategoryInfo(relPost.category).color} />
                  </View>
                  <View style={styles.relatedContent}>
                    <Text style={styles.relatedPostTitle} numberOfLines={2}>{relPost.title}</Text>
                    <Text style={styles.relatedMeta}>{relPost.reading_time} min read</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to buy or sell safely?</Text>
          <Text style={styles.ctaSubtitle}>Join thousands of users on Avida marketplace</Text>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.ctaButtonText}>Explore Listings</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
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
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Article Header
  articleHeader: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  articleHeaderDesktop: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
    padding: 40,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  backLinkText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  metaTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  countryTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  articleTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.onSurface,
    lineHeight: 36,
    marginBottom: 16,
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  metaDot: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginHorizontal: 8,
  },

  // Article Content
  articleContent: {
    padding: 20,
  },
  articleContentDesktop: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
    padding: 40,
  },
  contentBody: {
    marginBottom: 32,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 24,
    marginBottom: 12,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 20,
    marginBottom: 8,
    lineHeight: 24,
  },
  paragraph: {
    fontSize: 16,
    color: theme.colors.onSurface,
    lineHeight: 26,
    marginBottom: 16,
  },
  bold: {
    fontWeight: '600',
  },
  bulletList: {
    marginBottom: 16,
    paddingLeft: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: theme.colors.primary,
    marginRight: 12,
    width: 16,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginVertical: 24,
  },

  // FAQ Section
  faqSection: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 22,
    paddingLeft: 28,
  },

  // Tags Section
  tagsSection: {
    marginBottom: 24,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },

  // Internal Links Section
  internalLinksSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    paddingTop: 24,
    marginBottom: 24,
  },
  internalLinksTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 16,
  },
  internalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
    gap: 12,
  },
  internalLinkText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },

  // Related Posts Section
  relatedSection: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: 20,
  },
  relatedSectionDesktop: {
    padding: 40,
  },
  relatedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 20,
    textAlign: 'center',
  },
  relatedGrid: {
    gap: 16,
  },
  relatedGridDesktop: {
    flexDirection: 'row',
    justifyContent: 'center',
    maxWidth: 1000,
    alignSelf: 'center',
  },
  relatedCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  relatedCardDesktop: {
    flex: 1,
    maxWidth: 300,
  },
  relatedImagePlaceholder: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedContent: {
    padding: 12,
  },
  relatedPostTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 4,
    lineHeight: 20,
  },
  relatedMeta: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },

  // CTA Section
  ctaSection: {
    backgroundColor: theme.colors.primary,
    padding: 40,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
