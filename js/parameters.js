/**
 * Centralized Parameter Management for Narrative Visualization
 * Requirement: "parameters are the state variables of your narrative visualization"
 */
class VisualizationParameters {
    constructor() {
        // Global narrative state
        this.currentScene = 'scene1';
        this.transitionDuration = 1000;
        
        // Scene 1: Financial Evolution Parameters
        this.scene1 = {
            currentYear: 2015,
            showBudget: true,
            showRevenue: true,
            showProfit: true,
            yearRange: [1980, 2015]
        };
        
        // Scene 2: Genre Wars Parameters  
        this.scene2 = {
            selectedGenre: 'all',
            timeRange: 'all', // 'all', '1980s', '1990s', '2000s', '2010s'
            minMovieCount: 5,
            colorBy: 'rating' // 'rating', 'count', 'revenue'
        };
        
        // Scene 3: Blockbuster Formula Parameters
        this.scene3 = {
            profitThreshold: 0,
            selectedMovies: [],
            showOutliers: true,
            colorBy: 'profit', // 'profit', 'rating', 'genre', 'roi'
            scaleType: 'log' // 'linear', 'log'
        };
        
        // Visual consistency parameters (template compliance)
        this.template = {
            colors: {
                primary: '#1f77b4',    // Budget/Financial data
                secondary: '#ff7f0e',  // Revenue/Success metrics
                accent: '#2ca02c',     // Profit/Positive outcomes
                warning: '#d62728',    // Losses/Negative data
                neutral: '#7f7f7f'     // Supporting elements
            },
            dimensions: {
                margin: { top: 20, right: 20, bottom: 50, left: 80 },
                width: 800,
                height: 500
            },
            fonts: {
                title: '2em',
                subtitle: '1.2em',
                label: '1em',
                annotation: '0.9em'
            },
            annotations: {
                template: 'consistent', // Ensures visual consistency requirement
                style: {
                    fontSize: '12px',
                    titleFontSize: '14px',
                    wrap: 180,
                    padding: 10
                }
            }
        };
        
        // Data state parameters
        this.dataState = {
            loaded: false,
            processed: false,
            currentFilters: {},
            totalMovies: 0,
            dateRange: [1980, 2015]
        };
    }
    
    // Parameter update methods with state management
    updateScene1Parameters(params) {
        this.scene1 = { ...this.scene1, ...params };
        this.notifyParameterChange('scene1', params);
    }
    
    updateScene2Parameters(params) {
        this.scene2 = { ...this.scene2, ...params };
        this.notifyParameterChange('scene2', params);
    }
    
    updateScene3Parameters(params) {
        this.scene3 = { ...this.scene3, ...params };
        this.notifyParameterChange('scene3', params);
    }
    
    updateGlobalParameters(params) {
        Object.assign(this, params);
        this.notifyParameterChange('global', params);
    }
    
    // State definition methods (requirement compliance)
    getSceneState(sceneId) {
        return {
            scene: sceneId,
            parameters: this[sceneId] || {},
            template: this.template,
            dataState: this.dataState
        };
    }
    
    getAllStates() {
        return {
            current: this.currentScene,
            scene1: this.getSceneState('scene1'),
            scene2: this.getSceneState('scene2'),
            scene3: this.getSceneState('scene3'),
            global: {
                transitionDuration: this.transitionDuration,
                template: this.template,
                dataState: this.dataState
            }
        };
    }
    
    // Template consistency enforcement
    getConsistentTemplate() {
        return {
            margin: this.template.dimensions.margin,
            width: this.template.dimensions.width - this.template.dimensions.margin.left - this.template.dimensions.margin.right,
            height: this.template.dimensions.height - this.template.dimensions.margin.top - this.template.dimensions.margin.bottom,
            colors: this.template.colors,
            fonts: this.template.fonts,
            annotations: this.template.annotations
        };
    }
    
    // Parameter change notification system
    notifyParameterChange(scope, changes) {
        const event = new CustomEvent('parametersChanged', {
            detail: { scope, changes, state: this.getAllStates() }
        });
        document.dispatchEvent(event);
        console.log(`Parameters updated - ${scope}:`, changes);
    }
    
    // Reset to initial state
    reset() {
        this.currentScene = 'scene1';
        this.scene1 = {
            currentYear: 2015,
            showBudget: true,
            showRevenue: true,
            showProfit: true,
            yearRange: [1980, 2015]
        };
        this.scene2 = {
            selectedGenre: 'all',
            timeRange: 'all',
            minMovieCount: 5,
            colorBy: 'rating'
        };
        this.scene3 = {
            profitThreshold: 0,
            selectedMovies: [],
            showOutliers: true,
            colorBy: 'profit',
            scaleType: 'log'
        };
        this.notifyParameterChange('global', { reset: true });
    }
    
    // Validation methods
    validateParameters(sceneId, params) {
        const validations = {
            scene1: (p) => {
                return p.currentYear >= 1980 && p.currentYear <= 2015 &&
                       typeof p.showBudget === 'boolean' &&
                       typeof p.showRevenue === 'boolean' &&
                       typeof p.showProfit === 'boolean';
            },
            scene2: (p) => {
                const validTimeRanges = ['all', '1980s', '1990s', '2000s', '2010s'];
                return validTimeRanges.includes(p.timeRange) &&
                       p.minMovieCount >= 1 && p.minMovieCount <= 100 &&
                       typeof p.selectedGenre === 'string';
            },
            scene3: (p) => {
                const validColorBy = ['profit', 'rating', 'genre', 'roi'];
                const validScaleTypes = ['linear', 'log'];
                return p.profitThreshold >= 0 &&
                       validColorBy.includes(p.colorBy) &&
                       validScaleTypes.includes(p.scaleType) &&
                       Array.isArray(p.selectedMovies);
            }
        };
        
        return validations[sceneId] ? validations[sceneId](params) : true;
    }
}

// Global parameter instance
window.visualizationParameters = new VisualizationParameters();