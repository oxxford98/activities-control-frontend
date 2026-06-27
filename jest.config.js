const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
});

const customJestConfig = {
    testEnvironment: 'jest-environment-jsdom',

    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },

    collectCoverage: true,

    collectCoverageFrom: [
        'components/**/*.{ts,tsx}',
        'app/**/*.{ts,tsx}',
        '!**/*.d.ts',
    ],
};

module.exports = createJestConfig(customJestConfig);