/** @type {import('extension').FileConfig} */
const config = {
  config: (cfg) => {
    // Add Babel loader for JSX/React
    cfg.module.rules.push({
      test: /\.(js|jsx)$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', { targets: { browsers: ['last 2 Chrome versions'] } }],
            ['@babel/preset-react', { runtime: 'automatic' }]
          ]
        }
      }
    });

    return cfg;
  }
};

export default config;
