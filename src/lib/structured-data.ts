import { SITE_NAME, SITE_URL } from '@/lib/seo';

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  description:
    'Free tools for Adobe Stock contributors: AI prompt generation, keyword research, trend tracking and portfolio analytics.',
};

/** No SearchAction: the site has no ?q= results URL, and declaring a fake one is a spam signal. */
export const webSiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  publisher: { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'en',
};

export function softwareApplicationSchema(name: string, path: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    url: `${SITE_URL}${path}`,
    description,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

export function breadcrumbSchema(name: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${path}` },
    ],
  };
}

/**
 * FAQ copy. Single source for the visible FaqSection and the FAQPage schema —
 * Google treats FAQ markup without matching visible text as a violation.
 * Answer 3 is worded so it cannot be read as official Adobe data.
 */
export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'Is Stocklytics free?',
    answer:
      'Yes. All four tools are free to use, and the public tools need no signup or account.',
  },
  {
    question: 'Do I need an Adobe Stock contributor account?',
    answer:
      'No. Portfolio analytics works on any public Adobe Stock portfolio, so you can analyse your own or research others.',
  },
  {
    question: 'How are estimated earnings calculated?',
    answer:
      'They are our own estimate, derived from public download counts and how fast those counts change. They are not official Adobe figures and will differ from your real payouts.',
  },
  {
    question: 'How often does trend data update?',
    answer: 'Trend data refreshes hourly.',
  },
  {
    question: 'Can I use generated prompts commercially?',
    answer:
      'The prompts themselves are yours to use. Licensing of whatever you generate from them depends on the terms of the AI tool you run them through.',
  },
];

export function faqPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}
