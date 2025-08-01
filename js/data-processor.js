class DataProcessor {
    constructor() {
        this.movieData = [];
        this.processedData = {};
    }

    async loadData() {
        try {
            console.log('Loading data from data/tmdb_5000_movies.csv...');
            const data = await d3.csv('data/tmdb_5000_movies.csv');
            console.log('Raw data loaded:', data.length, 'rows');
            console.log('Sample row:', data[0]);
            this.movieData = data;
            this.processData();
            return this.processedData;
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    processData() {
        try {
            console.log('Processing data...');
            const cleanedData = this.movieData
                .map(d => this.cleanMovieData(d))
                .filter(d => d.isValid)
                .filter(d => d.year >= 1980 && d.year <= 2015);

            console.log('Cleaned data:', cleanedData.length, 'valid movies');

            this.processedData = {
                raw: cleanedData,
                byYear: this.groupByYear(cleanedData),
                byGenre: this.groupByGenre(cleanedData),
                byDecade: this.groupByDecade(cleanedData),
                topMovies: this.getTopMovies(cleanedData),
                summary: this.calculateSummaryStats(cleanedData)
            };

            console.log('Data processed successfully:', this.processedData.summary);
        } catch (error) {
            console.error('Error processing data:', error);
            throw error;
        }
    }

    cleanMovieData(d) {
        const budget = this.parseNumber(d.budget);
        const gross = this.parseNumber(d.gross);
        const year = parseInt(d.year);
        const rating = parseFloat(d.score) || 0;
        const votes = this.parseNumber(d.votes);
        const runtime = parseFloat(d.runtime) || 0;

        const profit = gross - budget;
        const profitMargin = budget > 0 ? (profit / budget) * 100 : 0;
        const roi = budget > 0 ? (gross / budget) : 0;

        return {
            name: d.name || 'Unknown',
            year: year,
            decade: Math.floor(year / 10) * 10,
            genre: this.parseGenre(d.genre),
            rating: rating,
            votes: votes,
            budget: budget,
            gross: gross,
            profit: profit,
            profitMargin: profitMargin,
            roi: roi,
            runtime: runtime,
            director: d.director || 'Unknown',
            star: d.star || 'Unknown',
            company: d.company || 'Unknown',
            country: d.country || 'Unknown',
            isValid: budget > 0 && gross > 0 && !isNaN(year) && year > 1900
        };
    }

    parseNumber(value) {
        if (!value || value === '') return 0;
        const num = parseFloat(value.toString().replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
    }

    parseGenre(genreString) {
        if (!genreString) return 'Unknown';
        return genreString.split(',')[0].trim();
    }

    groupByYear(data) {
        const grouped = d3.group(data, d => d.year);
        const result = [];

        for (let [year, movies] of grouped) {
            const stats = this.calculateGroupStats(movies);
            result.push({
                year: year,
                count: movies.length,
                ...stats,
                movies: movies
            });
        }

        return result.sort((a, b) => a.year - b.year);
    }

    groupByGenre(data) {
        const grouped = d3.group(data, d => d.genre);
        const result = [];

        for (let [genre, movies] of grouped) {
            if (movies.length >= 5) {
                const stats = this.calculateGroupStats(movies);
                result.push({
                    genre: genre,
                    count: movies.length,
                    ...stats,
                    movies: movies
                });
            }
        }

        return result.sort((a, b) => b.avgGross - a.avgGross);
    }

    groupByDecade(data) {
        const grouped = d3.group(data, d => d.decade);
        const result = [];

        for (let [decade, movies] of grouped) {
            const stats = this.calculateGroupStats(movies);
            result.push({
                decade: decade,
                count: movies.length,
                ...stats,
                movies: movies
            });
        }

        return result.sort((a, b) => a.decade - b.decade);
    }

    calculateGroupStats(movies) {
        const budgets = movies.map(d => d.budget).filter(d => d > 0);
        const grosses = movies.map(d => d.gross).filter(d => d > 0);
        const profits = movies.map(d => d.profit);
        const ratings = movies.map(d => d.rating).filter(d => d > 0);
        const runtimes = movies.map(d => d.runtime).filter(d => d > 0);

        return {
            avgBudget: d3.mean(budgets) || 0,
            medianBudget: d3.median(budgets) || 0,
            avgGross: d3.mean(grosses) || 0,
            medianGross: d3.median(grosses) || 0,
            avgProfit: d3.mean(profits) || 0,
            avgRating: d3.mean(ratings) || 0,
            avgRuntime: d3.mean(runtimes) || 0,
            totalBudget: d3.sum(budgets) || 0,
            totalGross: d3.sum(grosses) || 0,
            totalProfit: d3.sum(profits) || 0
        };
    }

    getTopMovies(data, n = 20) {
        return {
            byGross: [...data].sort((a, b) => b.gross - a.gross).slice(0, n),
            byProfit: [...data].sort((a, b) => b.profit - a.profit).slice(0, n),
            byROI: [...data].filter(d => d.budget > 1000000).sort((a, b) => b.roi - a.roi).slice(0, n),
            byRating: [...data].filter(d => d.votes > 10000).sort((a, b) => b.rating - a.rating).slice(0, n)
        };
    }

    calculateSummaryStats(data) {
        return {
            totalMovies: data.length,
            yearRange: [d3.min(data, d => d.year), d3.max(data, d => d.year)],
            totalBudget: d3.sum(data, d => d.budget),
            totalGross: d3.sum(data, d => d.gross),
            avgBudget: d3.mean(data, d => d.budget),
            avgGross: d3.mean(data, d => d.gross),
            avgRating: d3.mean(data.filter(d => d.rating > 0), d => d.rating),
            genreCount: new Set(data.map(d => d.genre)).size,
            profitableMovies: data.filter(d => d.profit > 0).length
        };
    }

    formatCurrency(value) {
        if (value >= 1000000000) {
            return `$${(value / 1000000000).toFixed(1)}B`;
        } else if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}K`;
        } else {
            return `$${value.toFixed(0)}`;
        }
    }

    formatNumber(value) {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        } else {
            return value.toFixed(0);
        }
    }
}

window.DataProcessor = DataProcessor;