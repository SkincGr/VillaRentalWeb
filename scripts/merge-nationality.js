const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qfmltxeattdcdetbrcie.supabase.co',
  'sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA'
);

async function main() {
  // 1. Get all nationalities
  const { data: nats, error: natErr } = await supabase
    .from('nationality')
    .select('*')
    .order('nationality_aid');

  if (natErr) { console.error('Error fetching nationalities:', natErr); return; }
  console.log('\n=== ALL NATIONALITIES ===');
  nats.forEach(n => console.log(`  ID=${n.nationality_aid}  "${n.nationality}"  symbol=${n.symbol}`));

  // 2. Find UK / English entries
  const ukEntry     = nats.find(n => n.nationality?.toLowerCase() === 'uk');
  const engEntry    = nats.find(n => n.nationality?.toLowerCase() === 'english');

  if (!ukEntry || !engEntry) {
    console.log('\nCould not find both entries. Aborting.');
    console.log('uk:', ukEntry, ' english:', engEntry);
    return;
  }

  console.log(`\nFound: UK (ID=${ukEntry.nationality_aid})  |  English (ID=${engEntry.nationality_aid})`);

  // 3. Count customers per entry
  const { data: custUk }  = await supabase.from('customers').select('custom_id').eq('f_nationallity_aid', ukEntry.nationality_aid);
  const { data: custEng } = await supabase.from('customers').select('custom_id').eq('f_nationallity_aid', engEntry.nationality_aid);

  console.log(`\nCustomers pointing to UK (${ukEntry.nationality_aid}):      ${custUk?.length ?? 0}`);
  console.log(`Customers pointing to English (${engEntry.nationality_aid}): ${custEng?.length ?? 0}`);

  // Strategy: KEEP "UK", rename to "United Kingdom / British"
  // Merge "English" → "UK", then delete "English"
  const keepId   = ukEntry.nationality_aid;
  const deleteId = engEntry.nationality_aid;

  console.log(`\nStrategy: KEEP ID=${keepId} (rename to "British / UK"), DELETE ID=${deleteId} (English)`);
  console.log('--- DRY RUN ONLY — run with --execute to apply ---');

  if (process.argv.includes('--execute')) {
    // Step A: Rename the keeper
    const { error: renameErr } = await supabase
      .from('nationality')
      .update({ nationality: 'British / UK', symbol: '🇬🇧' })
      .eq('nationality_aid', keepId);
    if (renameErr) { console.error('Rename error:', renameErr); return; }
    console.log(`✅ Renamed ID=${keepId} → "British / UK"`);

    // Step B: Re-point customers from deleteId → keepId
    if (custEng && custEng.length > 0) {
      const { error: updateErr } = await supabase
        .from('customers')
        .update({ f_nationallity_aid: keepId })
        .eq('f_nationallity_aid', deleteId);
      if (updateErr) { console.error('Customer update error:', updateErr); return; }
      console.log(`✅ Updated ${custEng.length} customer(s) from ID=${deleteId} → ID=${keepId}`);
    } else {
      console.log('No customers to re-point.');
    }

    // Step C: Delete the duplicate
    const { error: delErr } = await supabase
      .from('nationality')
      .delete()
      .eq('nationality_aid', deleteId);
    if (delErr) { console.error('Delete error:', delErr); return; }
    console.log(`✅ Deleted nationality ID=${deleteId} ("English")`);

    // Verify
    const { data: finalNats } = await supabase.from('nationality').select('*').order('nationality_aid');
    console.log('\n=== FINAL NATIONALITIES ===');
    finalNats.forEach(n => console.log(`  ID=${n.nationality_aid}  "${n.nationality}"  symbol=${n.symbol}`));
  }
}

main().catch(console.error);
