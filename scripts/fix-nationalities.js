const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qfmltxeattdcdetbrcie.supabase.co',
  'sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA'
);

// Corrections: [ id, correct_name, emoji_symbol ]
const corrections = [
  [7,  'France',       '🇫🇷'],  // "Franve" → France (duplicate of ID=6 "France" ← need to check)
  [14, 'Norway',       '🇳🇴'],  // "Norwei" → Norway
  [17, 'Switzerland',  '🇨🇭'],  // "Switcheralnd" → Switzerland
  [13, 'Croatian',     '🇭🇷'],  // "Kroatian" → Croatian
  // Fix existing clean entries with symbols too
  [1,  'Austrian',     '🇦🇹'],
  [2,  'Belgian',      '🇧🇪'],
  [3,  'Canadian',     '🇨🇦'],
  [4,  'Danish',       '🇩🇰'],
  [6,  'French',       '🇫🇷'],
  [8,  'French-Swiss', '🇫🇷🇨🇭'],
  [9,  'German',       '🇩🇪'],
  [10, 'Dutch',        '🇳🇱'],
  [11, 'Israeli',      '🇮🇱'],
  [12, 'Italian',      '🇮🇹'],
  [15, 'Polish',       '🇵🇱'],
  [16, 'Spanish',      '🇪🇸'],
  [19, 'American',     '🇺🇸'],
  [20, 'Greek',        '🇬🇷'],
];

async function main() {
  // Check if ID=7 "Franve" is a duplicate of ID=6 "France"
  const { data: custFranve } = await supabase.from('customers').select('custom_id').eq('f_nationallity_aid', 7);
  const { data: custFrance } = await supabase.from('customers').select('custom_id').eq('f_nationallity_aid', 6);

  console.log(`ID=7 "Franve" → ${custFranve?.length ?? 0} customers`);
  console.log(`ID=6 "France" → ${custFrance?.length ?? 0} customers`);

  if (process.argv.includes('--execute')) {

    // If Franve (7) has customers, merge them into France (6), then delete 7
    if (custFranve && custFranve.length > 0) {
      const { error: mergeFr } = await supabase
        .from('customers')
        .update({ f_nationallity_aid: 6 })
        .eq('f_nationallity_aid', 7);
      if (mergeFr) { console.error('Merge French error:', mergeFr); return; }
      console.log(`✅ Moved ${custFranve.length} customers from "Franve" (7) → "French" (6)`);
    }

    // Delete Franve (7)
    const { error: delFranve } = await supabase.from('nationality').delete().eq('nationality_aid', 7);
    if (delFranve) { console.error('Delete Franve error:', delFranve); return; }
    console.log(`✅ Deleted "Franve" (ID=7)`);

    // Apply all other corrections (skip 7 which is deleted)
    for (const [id, name, symbol] of corrections) {
      if (id === 7) continue;
      const { error } = await supabase
        .from('nationality')
        .update({ nationality: name, symbol })
        .eq('nationality_aid', id);
      if (error) { console.error(`Error updating ID=${id}:`, error); }
      else console.log(`✅ ID=${id} → "${name}" ${symbol}`);
    }

    // Final list
    const { data: final } = await supabase.from('nationality').select('*').order('nationality');
    console.log('\n=== FINAL NATIONALITIES ===');
    final.forEach(n => console.log(`  ID=${n.nationality_aid}  ${n.symbol ?? '  '}  "${n.nationality}"`));
  } else {
    console.log('\n--- DRY RUN. Run with --execute to apply. ---');
  }
}

main().catch(console.error);
