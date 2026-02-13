import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useResponsive } from '../src/hooks/useResponsive';

const COLORS = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  border: '#E5E7EB',
};

const FAQ_DATA = [
  {
    category: 'Getting Started',
    icon: 'rocket-outline',
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Click "Sign Up" on the homepage, enter your email address, create a password, and verify your email. You can also sign up using your Google account for faster registration.',
      },
      {
        q: 'How do I post a listing?',
        a: 'After logging in, click the "Post Listing" button. Fill in the title, description, price, and upload photos. Select a category, add your location, and publish your listing.',
      },
      {
        q: 'Is it free to post listings?',
        a: 'Yes! Basic listings are completely free. You can upgrade to featured listings or use our boost credits to increase visibility.',
      },
    ],
  },
  {
    category: 'Buying & Selling',
    icon: 'cart-outline',
    questions: [
      {
        q: 'How do I contact a seller?',
        a: 'Click on any listing and use the "Message Seller" button to start a conversation. You can also use the "Make Offer" feature to negotiate prices.',
      },
      {
        q: 'How do payments work?',
        a: 'Avida is a classifieds platform that connects buyers and sellers. Payments are arranged directly between parties. We recommend meeting in person and using cash or secure payment methods.',
      },
      {
        q: 'Can I negotiate prices?',
        a: 'Yes! Many listings are marked as "Negotiable." Use the Make Offer feature to propose your price, or discuss directly with the seller via messages.',
      },
      {
        q: 'How do I mark an item as sold?',
        a: 'Go to "My Listings" in your profile, find the item, and click "Mark as Sold." This removes the listing from active searches and notifies interested buyers.',
      },
    ],
  },
  {
    category: 'Account & Profile',
    icon: 'person-outline',
    questions: [
      {
        q: 'How do I verify my account?',
        a: 'Go to Settings > Trust & Identity. You can verify your phone number, email, and ID to earn trust badges that increase buyer confidence.',
      },
      {
        q: 'What is a Business Profile?',
        a: 'Business profiles are for professional sellers. They include a company name, logo, gallery, and verification badges. Premium business profiles get additional visibility.',
      },
      {
        q: 'How do I change my password?',
        a: 'Go to Settings > Account > Change Password. Enter your current password and your new password twice to confirm the change.',
      },
    ],
  },
  {
    category: 'Credits & Promotions',
    icon: 'wallet-outline',
    questions: [
      {
        q: 'What are boost credits?',
        a: 'Boost credits are used to promote your listings. Boosted listings appear higher in search results and get a "Featured" badge for increased visibility.',
      },
      {
        q: 'How do I purchase credits?',
        a: 'Go to the Credits page from your profile menu. Select a credit package and complete the purchase using Stripe, PayPal, or M-Pesa.',
      },
      {
        q: 'Do credits expire?',
        a: 'Credits do not expire and remain in your account until used. However, promotional bonus credits may have expiration dates.',
      },
    ],
  },
  {
    category: 'Safety & Security',
    icon: 'shield-checkmark-outline',
    questions: [
      {
        q: 'How do I report a suspicious listing?',
        a: 'Click the flag icon on any listing to report it. Select a reason and provide details. Our team reviews all reports within 24 hours.',
      },
      {
        q: 'How can I stay safe when meeting buyers/sellers?',
        a: 'Always meet in public places, tell someone where you\'re going, inspect items before paying, and use cash or secure payments. See our Safety Tips page for more.',
      },
      {
        q: 'What should I do if I\'ve been scammed?',
        a: 'Report the user immediately through our platform and contact local authorities. Keep all communication records and payment receipts as evidence.',
      },
    ],
  },
];

export default function FAQPage() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(FAQ_DATA[0].category);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
    setExpandedQuestion(null);
  };

  const toggleQuestion = (question: string) => {
    setExpandedQuestion(expandedQuestion === question ? null : question);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} data-testid="faq-back-button">
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.content, isDesktop && { maxWidth: 800, alignSelf: 'center', width: '100%' }]}
      >
        <View style={styles.heroSection}>
          <Ionicons name="help-circle" size={48} color={COLORS.primary} />
          <Text style={styles.heroTitle}>Frequently Asked Questions</Text>
          <Text style={styles.heroSubtitle}>Find answers to common questions about using Avida</Text>
        </View>

        <View style={styles.searchHint}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.searchHintText}>Can't find what you're looking for? Contact our support team.</Text>
        </View>

        <View style={styles.faqContainer}>
          {FAQ_DATA.map((section) => (
            <View key={section.category} style={styles.categorySection}>
              <TouchableOpacity 
                style={styles.categoryHeader} 
                onPress={() => toggleCategory(section.category)}
                data-testid={`faq-category-${section.category.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <View style={styles.categoryTitleRow}>
                  <View style={styles.categoryIconContainer}>
                    <Ionicons name={section.icon as any} size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.categoryTitle}>{section.category}</Text>
                </View>
                <Ionicons 
                  name={expandedCategory === section.category ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={COLORS.textSecondary} 
                />
              </TouchableOpacity>

              {expandedCategory === section.category && (
                <View style={styles.questionsContainer}>
                  {section.questions.map((item, index) => (
                    <View key={index} style={styles.questionItem}>
                      <TouchableOpacity 
                        style={styles.questionHeader} 
                        onPress={() => toggleQuestion(item.q)}
                        data-testid={`faq-question-${index}`}
                      >
                        <Text style={styles.questionText}>{item.q}</Text>
                        <Ionicons 
                          name={expandedQuestion === item.q ? 'remove' : 'add'} 
                          size={20} 
                          color={COLORS.primary} 
                        />
                      </TouchableOpacity>
                      {expandedQuestion === item.q && (
                        <Text style={styles.answerText}>{item.a}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactText}>Our support team is here to assist you.</Text>
          <TouchableOpacity 
            style={styles.contactButton} 
            onPress={() => router.push('/contact')}
            data-testid="faq-contact-button"
          >
            <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: 16 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 12, marginBottom: 4 },
  heroSubtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  searchHint: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.primaryLight, borderRadius: 8, marginBottom: 16 },
  searchHintText: { fontSize: 14, color: COLORS.primary, flex: 1 },
  faqContainer: { gap: 8 },
  categorySection: { backgroundColor: COLORS.surface, borderRadius: 12, overflow: 'hidden' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  categoryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  categoryTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  questionsContainer: { borderTopWidth: 1, borderTopColor: COLORS.border },
  questionItem: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  questionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingLeft: 24 },
  questionText: { fontSize: 15, fontWeight: '500', color: COLORS.text, flex: 1, paddingRight: 12 },
  answerText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, paddingHorizontal: 24, paddingBottom: 16, paddingTop: 0 },
  contactSection: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, marginTop: 24, alignItems: 'center' },
  contactTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  contactText: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  contactButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  contactButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
