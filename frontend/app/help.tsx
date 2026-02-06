import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../src/utils/api';
import { useAuthStore } from '../src/store/authStore';
import { useResponsive } from '../src/hooks/useResponsive';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#388E3C',
  warning: '#F57C00',
  info: '#1976D2',
};

const FAQ_DATA = [
  {
    id: '1',
    question: 'How do I create a listing?',
    answer: 'Tap the + button at the bottom of the screen, select a category, add photos and details, set your price, and publish your listing.',
  },
  {
    id: '2',
    question: 'How do I contact a seller?',
    answer: 'Open any listing and tap the "Chat" or "Message" button to start a conversation with the seller.',
  },
  {
    id: '3',
    question: 'Is my payment secure?',
    answer: 'We recommend meeting in person for transactions. Always inspect items before paying and use our in-app chat to communicate.',
  },
  {
    id: '4',
    question: 'How do I report a suspicious listing?',
    answer: 'Open the listing, tap the menu (three dots), and select "Report". Our team will review it within 24 hours.',
  },
  {
    id: '5',
    question: 'How do I delete my account?',
    answer: 'Go to Settings > Account > Delete Account. Your account will be scheduled for deletion after a 30-day cooling period.',
  },
  {
    id: '6',
    question: 'How do I verify my identity?',
    answer: 'Go to your Profile > Trust & Identity > ID Verified. Follow the steps to submit your government ID for verification.',
  },
];

// FAQ Item
const FAQItem = ({ item, isExpanded, onToggle }: { item: any; isExpanded: boolean; onToggle: () => void }) => (
  <TouchableOpacity style={styles.faqItem} onPress={onToggle}>
    <View style={styles.faqHeader}>
      <Text style={styles.faqQuestion}>{item.question}</Text>
      <Ionicons
        name={isExpanded ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={COLORS.textSecondary}
      />
    </View>
    {isExpanded && (
      <Text style={styles.faqAnswer}>{item.answer}</Text>
    )}
  </TouchableOpacity>
);

export default function HelpSupportScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;
  
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'tickets'>('faq');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingTickets(true);
    try {
      const response = await api.get('/support/tickets');
      setTickets(response.data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    }
  }, [activeTab, fetchTickets]);

  const handleSubmitTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/support/tickets', {
        subject: subject.trim(),
        message: message.trim(),
      });
      Alert.alert('Success', 'Your support ticket has been submitted. We\'ll get back to you soon!');
      setSubject('');
      setMessage('');
      setActiveTab('tickets');
      fetchTickets();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return COLORS.warning;
      case 'in_progress': return COLORS.info;
      case 'closed': return COLORS.success;
      default: return COLORS.textSecondary;
    }
  };

  // Tab content renderer for both mobile and desktop
  const renderFAQContent = () => (
    <>
      <View style={isLargeScreen ? desktopStyles.faqContainer : styles.faqContainer}>
        {FAQ_DATA.map(item => (
          <FAQItem
            key={item.id}
            item={item}
            isExpanded={expandedFAQ === item.id}
            onToggle={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
          />
        ))}
      </View>
      <View style={styles.contactPrompt}>
        <Text style={styles.contactPromptText}>Can't find what you're looking for?</Text>
        <TouchableOpacity onPress={() => setActiveTab('contact')}>
          <Text style={styles.contactPromptLink}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderContactContent = () => (
    <>
      {!isAuthenticated ? (
        <View style={styles.loginPrompt}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loginPromptText}>Please sign in to contact support</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/login')}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput
              style={[styles.textInput, isLargeScreen && desktopStyles.textInput]}
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief description of your issue"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput, isLargeScreen && desktopStyles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmitTicket}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Ticket</Text>
            )}
          </TouchableOpacity>

          <View style={styles.alternativeContact}>
            <Text style={styles.alternativeTitle}>Or reach us directly:</Text>
            <TouchableOpacity style={styles.contactMethod} onPress={() => Linking.openURL('mailto:support@avida.com')}>
              <Ionicons name="mail" size={20} color={COLORS.primary} />
              <Text style={styles.contactMethodText}>support@avida.com</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactMethod} onPress={() => Linking.openURL('tel:+1234567890')}>
              <Ionicons name="call" size={20} color={COLORS.primary} />
              <Text style={styles.contactMethodText}>+1 (234) 567-890</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </>
  );

  const renderTicketsContent = () => (
    <>
      {!isAuthenticated ? (
        <View style={styles.loginPrompt}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loginPromptText}>Please sign in to view your tickets</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/login')}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : loadingTickets ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="ticket-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>No tickets yet</Text>
          <Text style={styles.emptySubtitle}>Your support tickets will appear here</Text>
        </View>
      ) : (
        <View style={styles.ticketsList}>
          {tickets.map((ticket, index) => (
            <TouchableOpacity key={index} style={[styles.ticketCard, isLargeScreen && desktopStyles.ticketCard]}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
                <View style={[styles.ticketStatus, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
                  <Text style={[styles.ticketStatusText, { color: getStatusColor(ticket.status) }]}>
                    {ticket.status?.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.ticketMessage} numberOfLines={2}>{ticket.message}</Text>
              <Text style={styles.ticketDate}>{new Date(ticket.created_at).toLocaleDateString()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );

  // ============ DESKTOP VIEW ============
  if (isLargeScreen) {
    return (
      <View style={desktopStyles.container}>
        {/* Desktop Header */}
        <View style={desktopStyles.header}>
          <View style={desktopStyles.headerInner}>
            <TouchableOpacity style={desktopStyles.logoContainer} onPress={() => router.push('/')}>
              <View style={desktopStyles.logoIcon}>
                <Ionicons name="storefront" size={22} color="#fff" />
              </View>
              <Text style={desktopStyles.logoText}>avida</Text>
            </TouchableOpacity>
            <View style={desktopStyles.headerActions}>
              <TouchableOpacity style={desktopStyles.headerBtn} onPress={() => router.push('/profile')}>
                <Ionicons name="person-circle-outline" size={26} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={desktopStyles.postBtn} onPress={() => router.push('/post')}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={desktopStyles.postBtnText}>Post Listing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={desktopStyles.mainContent}>
          {/* Sidebar */}
          <View style={desktopStyles.sidebar}>
            <View style={desktopStyles.sidebarHeader}>
              <Ionicons name="help-buoy" size={24} color={COLORS.primary} />
              <Text style={desktopStyles.sidebarTitle}>Help & Support</Text>
            </View>

            <View style={desktopStyles.navItems}>
              {[
                { key: 'faq', label: 'FAQ', icon: 'help-circle-outline' },
                { key: 'contact', label: 'Contact Us', icon: 'mail-outline' },
                { key: 'tickets', label: 'My Tickets', icon: 'ticket-outline' },
              ].map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[desktopStyles.navItem, activeTab === tab.key && desktopStyles.navItemActive]}
                  onPress={() => setActiveTab(tab.key as any)}
                >
                  <Ionicons 
                    name={tab.icon as any} 
                    size={20} 
                    color={activeTab === tab.key ? COLORS.primary : COLORS.textSecondary} 
                  />
                  <Text style={[desktopStyles.navItemText, activeTab === tab.key && desktopStyles.navItemTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={desktopStyles.quickLinks}>
              <Text style={desktopStyles.quickLinksTitle}>QUICK LINKS</Text>
              <TouchableOpacity style={desktopStyles.quickLink} onPress={() => Linking.openURL('mailto:support@avida.com')}>
                <Ionicons name="mail" size={16} color={COLORS.textSecondary} />
                <Text style={desktopStyles.quickLinkText}>support@avida.com</Text>
              </TouchableOpacity>
              <TouchableOpacity style={desktopStyles.quickLink} onPress={() => Linking.openURL('tel:+1234567890')}>
                <Ionicons name="call" size={16} color={COLORS.textSecondary} />
                <Text style={desktopStyles.quickLinkText}>+1 (234) 567-890</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content Area */}
          <ScrollView style={desktopStyles.contentArea} contentContainerStyle={desktopStyles.contentInner}>
            <View style={desktopStyles.sectionCard}>
              <Text style={desktopStyles.sectionTitle}>
                {activeTab === 'faq' ? 'Frequently Asked Questions' : activeTab === 'contact' ? 'Contact Support' : 'My Support Tickets'}
              </Text>
              <Text style={desktopStyles.sectionSubtitle}>
                {activeTab === 'faq' ? 'Find answers to common questions' : activeTab === 'contact' ? 'Get help from our support team' : 'Track your support requests'}
              </Text>

              {activeTab === 'faq' && renderFAQContent()}
              {activeTab === 'contact' && renderContactContent()}
              {activeTab === 'tickets' && renderTicketsContent()}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  // ============ MOBILE VIEW ============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'faq', label: 'FAQ', icon: 'help-circle-outline' },
          { key: 'contact', label: 'Contact', icon: 'mail-outline' },
          { key: 'tickets', label: 'My Tickets', icon: 'ticket-outline' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'faq' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.faqContainer}>
            {FAQ_DATA.map(item => (
              <FAQItem
                key={item.id}
                item={item}
                isExpanded={expandedFAQ === item.id}
                onToggle={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
              />
            ))}
          </View>

          <View style={styles.contactPrompt}>
            <Text style={styles.contactPromptText}>Can't find what you're looking for?</Text>
            <TouchableOpacity onPress={() => setActiveTab('contact')}>
              <Text style={styles.contactPromptLink}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {activeTab === 'contact' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content}>
            {!isAuthenticated ? (
              <View style={styles.loginPrompt}>
                <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.loginPromptText}>Please sign in to contact support</Text>
                <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/login')}>
                  <Text style={styles.signInBtnText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Subject</Text>
                  <TextInput
                    style={styles.textInput}
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="Brief description of your issue"
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Message</Text>
                  <TextInput
                    style={[styles.textInput, styles.messageInput]}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Describe your issue in detail..."
                    placeholderTextColor={COLORS.textSecondary}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  onPress={handleSubmitTicket}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="#fff" />
                      <Text style={styles.submitBtnText}>Submit Ticket</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
                  <Text style={styles.infoText}>
                    We typically respond within 24-48 hours. You can track your ticket status in "My Tickets".
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {activeTab === 'tickets' && (
        <>
          {!isAuthenticated ? (
            <View style={styles.loginPrompt}>
              <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.loginPromptText}>Please sign in to view tickets</Text>
              <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/login')}>
                <Text style={styles.signInBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : loadingTickets ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : tickets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="ticket-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>No Tickets</Text>
              <Text style={styles.emptySubtitle}>You haven't submitted any support tickets yet</Text>
            </View>
          ) : (
            <FlatList
              data={tickets}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.ticketsList}
              renderItem={({ item }) => (
                <View style={styles.ticketItem}>
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketSubject}>{item.subject}</Text>
                    <View style={[styles.ticketStatus, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                      <Text style={[styles.ticketStatusText, { color: getStatusColor(item.status) }]}>
                        {item.status?.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketMessage} numberOfLines={2}>{item.message}</Text>
                  <Text style={styles.ticketDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              )}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
  content: { padding: 16 },
  faqContainer: { gap: 8 },
  faqItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestion: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text, marginRight: 12 },
  faqAnswer: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contactPrompt: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
  },
  contactPromptText: { fontSize: 14, color: COLORS.textSecondary },
  contactPromptLink: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginTop: 4 },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  loginPromptText: { fontSize: 15, color: COLORS.textSecondary },
  signInBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  signInBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  messageInput: { height: 150 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.info, lineHeight: 18 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  ticketsList: { padding: 16 },
  ticketItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ticketSubject: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  ticketStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  ticketStatusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  ticketMessage: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 8 },
  ticketDate: { fontSize: 12, color: COLORS.border },
  ticketCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
});

// ============ DESKTOP STYLES ============
const desktopStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
    maxWidth: 1200,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  postBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  sidebar: {
    width: 260,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: 24,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  navItems: {
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  navItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  navItemTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickLinks: {
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  quickLinksTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  quickLinkText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  contentArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentInner: {
    padding: 32,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  faqContainer: {
    gap: 12,
  },
  textInput: {
    height: 52,
  },
  messageInput: {
    height: 160,
  },
  ticketCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
