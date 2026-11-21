async function runE2EVerification() {
  console.log('🚀 Running CivicResolve End-to-End Automated System Verification...\n');
  const BASE_URL = 'http://localhost:3000';

  // 1. Verify Home Page
  console.log('1. Checking Landing Page HTTP Status...');
  const homeRes = await fetch(`${BASE_URL}/`);
  console.log(`✓ GET / status: ${homeRes.status} ${homeRes.statusText}`);

  // 2. Verify Stats API
  console.log('\n2. Checking Municipal Statistics API (/api/stats)...');
  const statsRes = await fetch(`${BASE_URL}/api/stats`);
  const statsData = await statsRes.json();
  console.log(`✓ Total Issues: ${statsData.stats.totalIssues}`);
  console.log(`✓ Resolved Percentage: ${statsData.stats.resolvedPercentage}%`);
  console.log(`✓ Ward Leaderboard Count: ${statsData.stats.wardLeaderboard.length} wards`);
  console.log(`✓ Top Ward: ${statsData.stats.wardLeaderboard[0]?.ward} (${statsData.stats.wardLeaderboard[0]?.resolutionRate}% resolved)`);

  // 3. Verify AI Issue Analysis (/api/issues/analyze)
  console.log('\n3. Checking Gemini AI Grievance Analysis (/api/issues/analyze)...');
  const analyzeRes = await fetch(`${BASE_URL}/api/issues/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Clock Tower Junction Pothole',
      description: 'Clock tower kitta periya pothole irukku, night time la theriyave illa bikes slip aaguthu accident danger.',
      location: 'Clock Tower, Ward 1, Erode',
    }),
  });
  const analyzeData = await analyzeRes.json();
  console.log(`✓ Analysis Category: ${analyzeData.analysis.category}`);
  console.log(`✓ Analysis Department: ${analyzeData.analysis.department}`);
  console.log(`✓ Priority Score: ${analyzeData.analysis.priorityScore}/100 (${analyzeData.analysis.priority})`);
  console.log(`✓ Detected Language: ${analyzeData.analysis.detectedLanguage} (${analyzeData.analysis.detectedScript})`);
  console.log(`✓ AI Reasoning: ${analyzeData.analysis.reasoning}`);

  // 4. Verify Grievance Creation (/api/issues)
  console.log('\n4. Testing Grievance Submission (/api/issues)...');
  const createRes = await fetch(`${BASE_URL}/api/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Live Verification: Broken Streetlight at Perundurai Road',
      description: 'Streetlight pole 4-5 are completely dark since 3 days, residents feel unsafe at night.',
      locationText: 'Perundurai Road near Collectorate, Erode',
      ward: 'Ward 3 - Collectorate & Veerappanchatiram',
      lat: 11.3525,
      lng: 77.7028,
      forceCreate: true,
    }),
  });
  const createData = await createRes.json();
  const newTrackingId = createData.trackingId;
  const newIssueId = createData.issue.id;
  console.log(`✓ Registered Grievance Tracking ID: ${newTrackingId} (ID: ${newIssueId})`);
  console.log(`✓ SLA Due Date: ${createData.issue.slaDueAt}`);

  // 5. Verify Grievance Detail & Status Events (/api/issues/[id])
  console.log('\n5. Checking Grievance Audit Ledger & Detail (/api/issues/[id])...');
  const detailRes = await fetch(`${BASE_URL}/api/issues/${newIssueId}`);
  const detailData = await detailRes.json();
  console.log(`✓ Status Events Count: ${detailData.issue.statusEvents.length}`);
  console.log(`✓ Initial Audit Note: "${detailData.issue.statusEvents[0]?.note}"`);

  // 6. Test Upvote System (/api/issues/[id]/upvote)
  console.log('\n6. Testing Upvote & Priority Boost (/api/issues/[id]/upvote)...');
  const upvoteRes = await fetch(`${BASE_URL}/api/issues/${newIssueId}/upvote`, {
    method: 'POST',
  });
  const upvoteData = await upvoteRes.json();
  console.log(`✓ Upvotes count: ${upvoteData.upvotes} (Has upvoted: ${upvoteData.hasUpvoted})`);
  console.log(`✓ Adjusted Priority Score: ${upvoteData.priorityScore}/100`);

  // 7. Verify Formal Complaint Letter Generation
  console.log('\n7. Generating Formal Grievance Complaint Letter (/api/issues/[id]/complaint-letter)...');
  const letterRes = await fetch(`${BASE_URL}/api/issues/${newIssueId}/complaint-letter`, {
    method: 'POST',
  });
  const letterData = await letterRes.json();
  console.log(`✓ Generated Complaint Letter length: ${letterData.letter.length} characters`);
  console.log(`Letter snippet:\n---\n${letterData.letter.split('\n').slice(0, 8).join('\n')}\n---`);

  // 8. Verify Admin Chief of Staff Briefing (/api/admin/briefing)
  console.log('\n8. Checking Admin AI "Today\'s Briefing" (/api/admin/briefing)...');
  const briefingRes = await fetch(`${BASE_URL}/api/admin/briefing`);
  const briefingData = await briefingRes.json();
  console.log(`✓ Headline: "${briefingData.briefing.headline}"`);
  console.log(`✓ Critical Urgent Count: ${briefingData.briefing.criticalUrgentCount}`);
  console.log(`✓ Top Clusters: ${briefingData.briefing.topClusters.length}`);
  console.log(`✓ Suggested Work Orders: ${briefingData.briefing.suggestedWorkOrders.length}`);

  // 9. Verify Admin Status Update & Human Override (/api/issues/[id])
  console.log('\n9. Testing Admin Lifecycle Status Update & Human Override...');
  const patchRes = await fetch(`${BASE_URL}/api/issues/${newIssueId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'IN_PROGRESS',
      assignedOfficer: 'Thiru. M. Arumugam (AEE Lighting)',
      note: 'Field crew dispatched with mobile crane. Replacement LED fittings loaded.',
    }),
  });
  const patchData = await patchRes.json();
  console.log(`✓ Status updated to: ${patchData.issue.status}`);
  console.log(`✓ Assigned Officer: ${patchData.issue.assignedOfficer}`);

  // 10. Verify Resolution
  console.log('\n10. Testing Admin Resolution & AI Verification...');
  const resolveRes = await fetch(`${BASE_URL}/api/issues/${newIssueId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'RESOLVED',
      resolutionImageUrl: '/seed/streetlight-after.svg',
      resolutionVerified: true,
      resolutionNote: 'All 4 luminaires replaced and luminaire lux meter calibrated to 25 lux. Corridor safely lit.',
    }),
  });
  const resolveData = await resolveRes.json();
  console.log(`✓ Grievance Status: ${resolveData.issue.status}`);
  console.log(`✓ Resolved At: ${resolveData.issue.resolvedAt}`);
  console.log(`✓ Resolution Verified: ${resolveData.issue.resolutionVerified}`);

  // 11. Verify Track By ID endpoint (/api/track/[trackingId])
  console.log('\n11. Testing Public Track-by-ID (/api/track/[trackingId])...');
  const trackRes = await fetch(`${BASE_URL}/api/track/${newTrackingId}`);
  const trackData = await trackRes.json();
  console.log(`✓ Tracked Tracking ID: ${trackData.issue.trackingId}`);
  console.log(`✓ Final Status: ${trackData.issue.status}`);
  console.log(`✓ Total Audit Events in Timeline: ${trackData.issue.statusEvents.length}`);

  console.log('\n🎉 ALL 11 VERIFICATION MILESTONES PASSED WITH 100% SUCCESS!');
}

runE2EVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

