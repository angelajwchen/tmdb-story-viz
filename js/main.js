class MovieVisualizationApp {
    constructor() {
        this.dataProcessor = new DataProcessor();
        this.data = null;
        this.currentScene = 'scene1';
        this.scenes = {};
        
        this.sceneConfig = {
            scene1: {
                title: "Hollywood's Financial Evolution (1980-2015)",
                description: "Overall trends in movie budgets, revenues, and profitability",
                class: Scene1
            },
            scene2: {
                title: "Which Genres Dominate the Box Office?",
                description: "Genre popularity and profitability analysis",
                class: Scene2
            },
            scene3: {
                title: "What Makes a Movie Successful?",
                description: "Deep dive into the most profitable movies and success factors",
                class: Scene3
            }
        };
    }

    async init() {
        try {
            this.showLoading(true);
            
            // Load and process data
            this.data = await this.dataProcessor.loadData();
            console.log('Data loaded successfully:', this.data.summary);
            
            // Initialize scenes
            this.initializeScenes();
            
            // Set up navigation
            this.setupNavigation();
            
            // Render initial scene
            this.renderScene(this.currentScene);
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            console.error('Error details:', error.message);
            this.showError(`Failed to load movie data: ${error.message}. Please check if the data files are available and the server is running.`);
        }
    }

    showLoading(show) {
        if (show) {
            d3.select('#visualization').html(`
                <div style="display: flex; justify-content: center; align-items: center; height: 400px; flex-direction: column;">
                    <div style="font-size: 18px; margin-bottom: 20px;">Loading movie data...</div>
                    <div style="width: 50px; height: 50px; border: 3px solid #f3f3f3; border-top: 3px solid #1f77b4; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `);
        }
    }

    showError(message) {
        d3.select('#visualization').html(`
            <div style="display: flex; justify-content: center; align-items: center; height: 400px; flex-direction: column; color: #d62728;">
                <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                <div style="font-size: 16px; text-align: center; max-width: 400px;">${message}</div>
            </div>
        `);
    }

    initializeScenes() {
        Object.keys(this.sceneConfig).forEach(sceneId => {
            const config = this.sceneConfig[sceneId];
            this.scenes[sceneId] = new config.class('#visualization', this.data, this.dataProcessor);
        });
    }

    setupNavigation() {
        const self = this;
        
        d3.selectAll('.nav-btn').on('click', function() {
            const sceneId = d3.select(this).attr('data-scene');
            
            // Update button states
            d3.selectAll('.nav-btn').classed('active', false);
            d3.select(this).classed('active', true);
            
            // Render new scene
            self.renderScene(sceneId);
        });

        // Add keyboard navigation
        d3.select('body').on('keydown', function(event) {
            const key = event.key;
            const sceneIds = Object.keys(self.sceneConfig);
            const currentIndex = sceneIds.indexOf(self.currentScene);
            
            let newIndex = currentIndex;
            
            if (key === 'ArrowLeft' || key === 'ArrowUp') {
                newIndex = Math.max(0, currentIndex - 1);
            } else if (key === 'ArrowRight' || key === 'ArrowDown') {
                newIndex = Math.min(sceneIds.length - 1, currentIndex + 1);
            }
            
            if (newIndex !== currentIndex) {
                const newSceneId = sceneIds[newIndex];
                d3.selectAll('.nav-btn').classed('active', false);
                d3.select(`.nav-btn[data-scene="${newSceneId}"]`).classed('active', true);
                self.renderScene(newSceneId);
            }
        });
    }

    renderScene(sceneId) {
        if (!this.scenes[sceneId] || !this.data) {
            console.error('Scene or data not available:', sceneId);
            return;
        }

        // Clean up previous scene
        if (this.currentScene && this.scenes[this.currentScene]) {
            if (this.scenes[this.currentScene].cleanup) {
                this.scenes[this.currentScene].cleanup();
            }
        }

        // Update current scene
        this.currentScene = sceneId;
        
        // Update scene title and description
        const config = this.sceneConfig[sceneId];
        d3.select('#current-scene-title').text(config.title);
        d3.select('#current-scene-description').text(config.description);
        
        // Clear visualization area
        d3.select('#visualization').html('');
        d3.select('#controls-panel').html('');
        d3.select('#annotations').html('');
        
        // Add transition effect
        d3.select('#scene-container')
            .style('opacity', 0.7)
            .transition()
            .duration(500)
            .style('opacity', 1)
            .on('end', () => {
                // Render new scene
                try {
                    this.scenes[sceneId].render();
                } catch (error) {
                    console.error('Error rendering scene:', sceneId, error);
                    this.showError(`Failed to render ${config.title}. Please try refreshing the page.`);
                }
            });
    }

    // Utility method to get scene data summary
    getSceneSummary() {
        if (!this.data) return null;
        
        return {
            totalMovies: this.data.summary.totalMovies,
            yearRange: this.data.summary.yearRange,
            totalRevenue: this.dataProcessor.formatCurrency(this.data.summary.totalGross),
            avgRating: this.data.summary.avgRating.toFixed(1),
            topGenres: this.data.byGenre.slice(0, 5).map(d => d.genre),
            topMovies: this.data.topMovies.byProfit.slice(0, 3).map(d => d.name)
        };
    }

    // Method to export current scene as image (optional enhancement)
    exportScene() {
        const svg = d3.select('#visualization svg').node();
        if (!svg) return;
        
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svg);
        const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `hollywood-viz-${this.currentScene}.svg`;
        link.click();
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const app = new MovieVisualizationApp();
    app.init();
    
    // Make app globally available for debugging
    window.movieApp = app;
    
    // Add export functionality (optional)
    d3.select('body').append('div')
        .style('position', 'fixed')
        .style('bottom', '20px')
        .style('right', '20px')
        .style('z-index', '1000')
        .append('button')
        .attr('id', 'export-btn')
        .style('background', '#1f77b4')
        .style('color', 'white')
        .style('border', 'none')
        .style('padding', '10px 15px')
        .style('border-radius', '5px')
        .style('cursor', 'pointer')
        .style('font-size', '12px')
        .text('Export SVG')
        .on('click', () => app.exportScene());
});

// Add some helpful console messages for development
console.log('Hollywood Movie Visualization App');
console.log('Navigation: Use arrow keys or click buttons to switch scenes');
console.log('Interactions: Hover over data points for details, use controls to filter data');