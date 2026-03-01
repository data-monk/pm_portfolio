export const METRIC_CATALOG = [
  { key: 'engagement_rate',       label: 'Engagement Rate',      icon: '⚡', category: 'Content Performance' },
  { key: 'follower_conversion',   label: 'Follower Conversion',  icon: '📈', category: 'Content Performance' },
  { key: 'watch_time_lift',       label: 'Watch Time Lift',      icon: '⏱️', category: 'Content Performance' },
  { key: 'repeat_viewership',     label: 'Repeat Viewership',    icon: '🔁', category: 'Content Performance' },
  { key: 'product_link_ctr',      label: 'Product Link CTR',     icon: '🔗', category: 'Content Performance' },
  { key: 'ai_replies_generated',  label: 'AI Replies Generated', icon: '🤖', category: 'Reply Automation' },
  { key: 'reply_acceptance_rate', label: 'AI Reply Acceptance',  icon: '✅', category: 'Reply Automation' },
  { key: 'avg_response_time',     label: 'Avg Response Time',    icon: '⏳', category: 'Reply Automation' },
  { key: 'comment_sentiment',     label: 'Positive Sentiment',   icon: '😊', category: 'Community Health' },
  { key: 'spam_rate',             label: 'Spam Rate',            icon: '🚫', category: 'Community Health' },
]

export const DEFAULT_METRIC_KEYS = [
  'engagement_rate',
  'follower_conversion',
  'watch_time_lift',
  'repeat_viewership',
  'product_link_ctr',
]

export const METRICS = {
  tech: {
    engagement_rate:       { value: '8.4%',    delta: '+1.2%'    },
    follower_conversion:   { value: '3.2%',    delta: '+0.4%'    },
    watch_time_lift:       { value: '+24%',    delta: null       },
    repeat_viewership:     { value: '62%',     delta: '+5%'      },
    product_link_ctr:      { value: '1.8%',    delta: '+0.3%'    },
    ai_replies_generated:  { value: '1,248',   delta: '+312'     },
    reply_acceptance_rate: { value: '87%',     delta: '+4%'      },
    avg_response_time:     { value: '1.2 min', delta: '-0.3 min' },
    comment_sentiment:     { value: '78%',     delta: '+3%'      },
    spam_rate:             { value: '2.1%',    delta: '-0.4%'    },
  },
  lifestyle: {
    engagement_rate:       { value: '11.2%',   delta: '+2.1%'    },
    follower_conversion:   { value: '4.7%',    delta: '+0.8%'    },
    watch_time_lift:       { value: '+31%',    delta: null       },
    repeat_viewership:     { value: '71%',     delta: '+8%'      },
    product_link_ctr:      { value: '2.9%',    delta: '+0.5%'    },
    ai_replies_generated:  { value: '2,107',   delta: '+518'     },
    reply_acceptance_rate: { value: '91%',     delta: '+2%'      },
    avg_response_time:     { value: '0.9 min', delta: '-0.2 min' },
    comment_sentiment:     { value: '84%',     delta: '+5%'      },
    spam_rate:             { value: '1.4%',    delta: '-0.2%'    },
  },
  fitness: {
    engagement_rate:       { value: '9.8%',    delta: '+1.7%'    },
    follower_conversion:   { value: '3.9%',    delta: '+0.6%'    },
    watch_time_lift:       { value: '+28%',    delta: null       },
    repeat_viewership:     { value: '66%',     delta: '+6%'      },
    product_link_ctr:      { value: '2.1%',    delta: '+0.4%'    },
    ai_replies_generated:  { value: '1,589',   delta: '+401'     },
    reply_acceptance_rate: { value: '89%',     delta: '+3%'      },
    avg_response_time:     { value: '1.0 min', delta: '-0.2 min' },
    comment_sentiment:     { value: '81%',     delta: '+4%'      },
    spam_rate:             { value: '1.8%',    delta: '-0.3%'    },
  },
}
