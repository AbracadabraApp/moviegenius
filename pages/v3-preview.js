// V3 Preview Page - Shows what movie pages will look like with V3 content
import PhoneFrame from '../components/PhoneFrame';
import WhyWatchSection from '../components/WhyWatchSection';

export default function V3Preview() {
  // Real data from v3-test-results.json
  const yesExample = {
    title: "Star Trek II: The Wrath of Khan",
    year: 1982,
    poster: "https://image.tmdb.org/t/p/w500/kNRMUZf3svyWpoySeKf1s2njgBz.jpg",
    recommendation: "YES",
    reasons: [
      "Khan's revenge obsession drives compelling villain",
      "Spock's sacrifice provides genuine emotional weight",
      "Space submarine warfare creates tense battles"
    ],
    context: "Admiral Kirk faces genetically enhanced nemesis Khan in starship combat resembling naval warfare. Shatner and Nimoy deliver career-best performances. Superior to disappointing first film, launching successful Trek movie franchise."
  };

  const noExample = {
    title: "Star Trek V: The Final Frontier",
    year: 1989,
    poster: "https://image.tmdb.org/t/p/w500/pMJ5pB8T0VbmjDIOedOggdm4dPB.jpg",
    recommendation: "NO",
    reasons: [
      "Shatner's direction feels amateurish and unfocused",
      "God subplot becomes unintentionally ridiculous and preachy",
      "Special effects look embarrassingly cheap throughout"
    ],
    context: "Kirk's half-brother leads religious fanatics seeking God beyond the galactic barrier. Shatner's directorial debut suffers from budget cuts and weak storytelling. Widely considered the worst Trek film, lacking the charm of previous entries despite some character moments."
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>V3 Movie Page Preview</h1>
      <p style={styles.subtitle}>Real examples from test results</p>

      {/* YES Example */}
      <div style={styles.exampleContainer}>
        <div style={styles.label}>YES Recommendation</div>
        <PhoneFrame>
          <div style={styles.movieHeader}>
            <img src={yesExample.poster} style={styles.poster} alt={yesExample.title} />
            <div>
              <h1 style={styles.movieTitle}>{yesExample.title}</h1>
              <div style={styles.movieMeta}>{yesExample.year} · 113 min · PG</div>
            </div>
          </div>

          <WhyWatchSection
            reasons={yesExample.reasons}
            recommendation={yesExample.recommendation}
            context={yesExample.context}
          />

          <div style={styles.placeholder}>
            <p style={styles.placeholderText}>
              [Rest of page: Full Analysis, More Ideas, Streaming, etc.]
            </p>
          </div>
        </PhoneFrame>
      </div>

      {/* NO Example */}
      <div style={styles.exampleContainer}>
        <div style={styles.label}>NO Recommendation</div>
        <PhoneFrame>
          <div style={styles.movieHeader}>
            <img src={noExample.poster} style={styles.poster} alt={noExample.title} />
            <div>
              <h1 style={styles.movieTitle}>{noExample.title}</h1>
              <div style={styles.movieMeta}>{noExample.year} · 107 min · PG</div>
            </div>
          </div>

          <WhyWatchSection
            reasons={noExample.reasons}
            recommendation={noExample.recommendation}
            context={noExample.context}
          />

          <div style={styles.placeholder}>
            <p style={styles.placeholderText}>
              [Rest of page: Full Analysis, More Ideas, Streaming, etc.]
            </p>
          </div>
        </PhoneFrame>
      </div>

      <div style={styles.notes}>
        <h3 style={styles.notesTitle}>V3 Changes</h3>
        <ul style={styles.notesList}>
          <li><strong>Neutral bullets:</strong> Gray instead of gold/red for better readability</li>
          <li><strong>Specific reasons:</strong> 5-7 words each, no "Masterful/Iconic" stopwords</li>
          <li><strong>NEW: Context paragraph:</strong> 30 words giving plot + performances + comparisons</li>
          <li><strong>NO uses emoji:</strong> "⏭️ Skip This One" instead of error-like red styling</li>
          <li><strong>Everything else unchanged:</strong> Same page layout, More Ideas, etc.</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '40px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#f3f4f6',
    minHeight: '100vh',
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '8px',
    color: '#111827',
  },
  subtitle: {
    fontSize: '16px',
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: '40px',
  },
  exampleContainer: {
    marginBottom: '40px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#6b7280',
    marginBottom: '12px',
    textAlign: 'center',
  },
  movieHeader: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    padding: '20px',
  },
  poster: {
    width: '125px',
    height: '188px',
    borderRadius: '4px',
    objectFit: 'cover',
  },
  movieTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#111827',
  },
  movieMeta: {
    fontSize: '14px',
    color: '#6b7280',
  },
  placeholder: {
    padding: '40px 20px',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    margin: '0 20px',
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  notes: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginTop: '60px',
  },
  notesTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '16px',
    color: '#111827',
  },
  notesList: {
    fontSize: '15px',
    lineHeight: '1.8',
    color: '#374151',
  },
};
