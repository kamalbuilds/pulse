const { check, sleep } = require('k6');
const http = require('k6/http');
const { Connection, PublicKey, Keypair, Transaction } = require('@solana/web3.js');
const { AnchorProvider, Program, workspace } = require('@coral-xyz/anchor');

// Load testing configuration
export const options = {
  scenarios: {
    // Ramping load test for portfolio calculations
    portfolio_calculations: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 10 },   // Ramp up to 10 users
        { duration: '5m', target: 10 },   // Stay at 10 users
        { duration: '2m', target: 20 },   // Ramp up to 20 users
        { duration: '5m', target: 20 },   // Stay at 20 users
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '5m', target: 0 },    // Ramp down
      ],
    },

    // Stress test for concurrent computations
    stress_test: {
      executor: 'constant-arrival-rate',
      rate: 30, // 30 iterations per second
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 100,
      maxVUs: 200,
    },

    // Spike test for sudden load
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      stages: [
        { duration: '2m', target: 5 },    // Normal load
        { duration: '30s', target: 100 }, // Spike to 100/sec
        { duration: '3m', target: 100 },  // Sustained spike
        { duration: '30s', target: 5 },   // Back to normal
        { duration: '3m', target: 5 },    // Recovery period
      ],
      preAllocatedVUs: 150,
      maxVUs: 300,
    },

    // Soak test for long-term stability
    soak_test: {
      executor: 'constant-vus',
      vus: 20,
      duration: '1h', // Run for 1 hour
    },
  },

  thresholds: {
    // Performance thresholds
    'http_req_duration': ['p(95)<5000'], // 95% of requests under 5s
    'http_req_duration{type:portfolio_calc}': ['p(90)<3000'], // Portfolio calcs under 3s
    'http_req_duration{type:risk_metrics}': ['p(90)<4000'], // Risk metrics under 4s
    'http_req_failed': ['rate<0.05'], // Error rate under 5%

    // Solana-specific thresholds
    'solana_tx_duration': ['p(95)<10000'], // Transaction confirmation under 10s
    'solana_tx_failed': ['rate<0.02'], // Transaction failure rate under 2%

    // Resource utilization thresholds
    'memory_usage': ['value<80'], // Memory usage under 80%
    'cpu_usage': ['value<85'], // CPU usage under 85%
  },
};

// Test configuration
const CONFIG = {
  SOLANA_RPC_URL: __ENV.SOLANA_RPC_URL || 'http://localhost:8899',
  PROGRAM_ID: __ENV.PROGRAM_ID || '7pPDQeV8khtG814YMxo41kgt8dJERZxfRkf9MbkUsJHr',
  FRONTEND_URL: __ENV.FRONTEND_URL || 'http://localhost:3000',
};

// Global setup
export function setup() {
  console.log('Setting up load testing environment...');

  // Create test users
  const testUsers = [];
  for (let i = 0; i < 100; i++) {
    testUsers.push({
      keypair: Keypair.generate(),
      portfolioValue: Math.random() * 10000000000, // Random portfolio value
      riskTolerance: Math.random(),
    });
  }

  // Initialize portfolios (if needed for testing)
  console.log(`Created ${testUsers.length} test users`);

  return { testUsers };
}

export default function (data) {
  const { testUsers } = data;
  const testUser = testUsers[Math.floor(Math.random() * testUsers.length)];

  // Randomly select test scenario
  const scenarios = [
    portfolioCalculationTest,
    riskMetricsTest,
    peerComparisonTest,
    frontendInteractionTest,
  ];

  const selectedTest = scenarios[Math.floor(Math.random() * scenarios.length)];
  selectedTest(testUser);

  sleep(Math.random() * 2); // Random sleep between 0-2 seconds
}

// Portfolio calculation load test
function portfolioCalculationTest(testUser) {
  const startTime = Date.now();

  try {
    // Simulate encrypted portfolio data
    const encryptedData = generateMockEncryptedData(testUser.portfolioValue);

    // Submit portfolio calculation request
    const response = http.post(`${CONFIG.FRONTEND_URL}/api/calculate-portfolio`, {
      encrypted_data: encryptedData,
      user_pubkey: testUser.keypair.publicKey.toString(),
      timestamp: Date.now(),
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { type: 'portfolio_calc' },
      timeout: '30s',
    });

    // Validate response
    check(response, {
      'portfolio calculation status is 200': (r) => r.status === 200,
      'portfolio calculation response time < 5s': (r) => r.timings.duration < 5000,
      'response contains computation_id': (r) => JSON.parse(r.body).computation_id !== undefined,
    });

    if (response.status === 200) {
      const result = JSON.parse(response.body);

      // Poll for computation result
      const computationResult = pollForComputationResult(result.computation_id, 30000);

      check(computationResult, {
        'computation completed successfully': (r) => r && r.status === 'completed',
        'computation result is valid': (r) => r && r.portfolio_value > 0,
      });
    }

  } catch (error) {
    console.error(`Portfolio calculation test failed: ${error.message}`);
    check(null, {
      'portfolio calculation test completed': false,
    });
  }

  // Record custom metrics
  const duration = Date.now() - startTime;
  recordCustomMetric('portfolio_calc_duration', duration);
}

// Risk metrics calculation test
function riskMetricsTest(testUser) {
  const startTime = Date.now();

  try {
    // Generate mock performance history
    const performanceData = generateMockPerformanceHistory();

    const response = http.post(`${CONFIG.FRONTEND_URL}/api/calculate-risk-metrics`, {
      encrypted_performance_data: performanceData,
      user_pubkey: testUser.keypair.publicKey.toString(),
      timestamp: Date.now(),
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { type: 'risk_metrics' },
      timeout: '45s',
    });

    check(response, {
      'risk metrics status is 200': (r) => r.status === 200,
      'risk metrics response time < 4s': (r) => r.timings.duration < 4000,
    });

    if (response.status === 200) {
      const result = JSON.parse(response.body);

      // Wait for computation to complete
      const metricsResult = pollForComputationResult(result.computation_id, 45000);

      check(metricsResult, {
        'risk metrics computed': (r) => r && r.sharpe_ratio !== undefined,
        'volatility calculated': (r) => r && r.daily_volatility > 0,
        'VaR calculated': (r) => r && r.var_95 > 0 && r.var_99 > r.var_95,
      });
    }

  } catch (error) {
    console.error(`Risk metrics test failed: ${error.message}`);
  }

  recordCustomMetric('risk_metrics_duration', Date.now() - startTime);
}

// Peer comparison test
function peerComparisonTest(testUser) {
  const startTime = Date.now();

  try {
    const comparisonData = {
      user_performance: Math.random() * 1000 - 500, // -500 to 500 basis points
      encrypted_data: generateMockEncryptedData(testUser.portfolioValue),
      user_pubkey: testUser.keypair.publicKey.toString(),
    };

    const response = http.post(`${CONFIG.FRONTEND_URL}/api/peer-comparison`, comparisonData, {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { type: 'peer_comparison' },
      timeout: '60s',
    });

    check(response, {
      'peer comparison status is 200': (r) => r.status === 200,
      'peer comparison response time < 6s': (r) => r.timings.duration < 6000,
    });

    if (response.status === 200) {
      const result = JSON.parse(response.body);
      const comparisonResult = pollForComputationResult(result.computation_id, 60000);

      check(comparisonResult, {
        'percentile calculated': (r) => r && r.peer_percentile >= 0 && r.peer_percentile <= 100,
        'relative performance calculated': (r) => r && r.relative_performance !== undefined,
        'privacy maintained': (r) => r && !r.individual_peer_data,
      });
    }

  } catch (error) {
    console.error(`Peer comparison test failed: ${error.message}`);
  }

  recordCustomMetric('peer_comparison_duration', Date.now() - startTime);
}

// Frontend interaction test
function frontendInteractionTest(testUser) {
  const startTime = Date.now();

  try {
    // Test main dashboard load
    const dashboardResponse = http.get(`${CONFIG.FRONTEND_URL}/dashboard`, {
      tags: { type: 'frontend' },
    });

    check(dashboardResponse, {
      'dashboard loads successfully': (r) => r.status === 200,
      'dashboard load time < 3s': (r) => r.timings.duration < 3000,
      'dashboard contains portfolio section': (r) => r.body.includes('portfolio'),
    });

    // Test API endpoints
    const portfolioResponse = http.get(`${CONFIG.FRONTEND_URL}/api/portfolio/${testUser.keypair.publicKey.toString()}`, {
      tags: { type: 'api' },
    });

    check(portfolioResponse, {
      'portfolio API responds': (r) => r.status === 200 || r.status === 404,
      'portfolio API response time < 2s': (r) => r.timings.duration < 2000,
    });

    // Test wallet connection endpoint
    const walletResponse = http.post(`${CONFIG.FRONTEND_URL}/api/wallet/connect`, {
      public_key: testUser.keypair.publicKey.toString(),
    }, {
      tags: { type: 'wallet' },
    });

    check(walletResponse, {
      'wallet connection handled': (r) => r.status === 200 || r.status === 400,
    });

  } catch (error) {
    console.error(`Frontend test failed: ${error.message}`);
  }

  recordCustomMetric('frontend_interaction_duration', Date.now() - startTime);
}

// Solana blockchain stress test
function solanaBlockchainTest(testUser) {
  const startTime = Date.now();

  try {
    // This would require actual Solana Web3.js integration
    // For now, we'll simulate the blockchain interaction

    const txSimulation = http.post(`${CONFIG.SOLANA_RPC_URL}`, {
      jsonrpc: '2.0',
      id: 1,
      method: 'simulateTransaction',
      params: [
        'simulated_transaction_data', // This would be actual transaction data
        { commitment: 'confirmed' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { type: 'solana_rpc' },
    });

    check(txSimulation, {
      'solana RPC responds': (r) => r.status === 200,
      'solana RPC response time < 2s': (r) => r.timings.duration < 2000,
    });

    recordCustomMetric('solana_tx_duration', Date.now() - startTime);

  } catch (error) {
    console.error(`Solana blockchain test failed: ${error.message}`);
  }
}

// Helper functions
function generateMockEncryptedData(portfolioValue) {
  // Generate realistic looking encrypted data for testing
  const mockData = {
    encrypted_portfolio: Buffer.from('mock_encrypted_portfolio_data_' + Math.random()).toString('base64'),
    nonce: Buffer.from('mock_nonce_' + Math.random()).toString('base64'),
    public_key: Buffer.from('mock_public_key_' + Math.random()).toString('base64'),
  };

  return JSON.stringify(mockData);
}

function generateMockPerformanceHistory() {
  const days = 30;
  const returns = [];
  const values = [];

  let currentValue = 1000000; // Start with $1000

  for (let i = 0; i < days; i++) {
    const dailyReturn = (Math.random() - 0.5) * 1000; // -500 to 500 basis points
    returns.push(dailyReturn);

    currentValue *= (1 + dailyReturn / 10000);
    values.push(Math.floor(currentValue));
  }

  return JSON.stringify({
    encrypted_returns: Buffer.from(JSON.stringify(returns)).toString('base64'),
    encrypted_values: Buffer.from(JSON.stringify(values)).toString('base64'),
    nonce: Buffer.from('performance_nonce_' + Math.random()).toString('base64'),
  });
}

function pollForComputationResult(computationId, timeoutMs) {
  const startTime = Date.now();
  const pollInterval = 1000; // Poll every second

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = http.get(`${CONFIG.FRONTEND_URL}/api/computation/${computationId}`, {
        tags: { type: 'computation_poll' },
      });

      if (response.status === 200) {
        const result = JSON.parse(response.body);
        if (result.status === 'completed') {
          return result;
        } else if (result.status === 'failed') {
          return null;
        }
      }

    } catch (error) {
      console.error(`Polling error: ${error.message}`);
    }

    sleep(pollInterval / 1000);
  }

  console.error(`Computation ${computationId} timed out after ${timeoutMs}ms`);
  return null;
}

function recordCustomMetric(metricName, value) {
  // Record custom metrics for detailed analysis
  console.log(`${metricName}: ${value}ms`);
}

// Teardown function
export function teardown(data) {
  console.log('Tearing down load testing environment...');

  // Generate performance report
  console.log('Load testing completed. Check metrics for detailed performance analysis.');

  // Could save results to file or send to monitoring system
}