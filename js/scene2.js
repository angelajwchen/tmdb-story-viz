class Scene2 {
    constructor(container, data, dataProcessor) {
        this.container = container;
        this.data = data;
        this.dataProcessor = dataProcessor;
        this.margin = { top: 20, right: 20, bottom: 50, left: 80 };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;
        
        this.selectedGenre = 'all';
        this.timeRange = 'all';
        this.minMovieCount = 5;
        
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
    }

    render() {
        this.setupControls();
        this.createVisualization();
        this.addAnnotations();
        this.updateInsights();
    }

    setupControls() {
        const controlsPanel = d3.select('#controls-panel');
        controlsPanel.html('');

        const genres = ['all', ...this.data.byGenre.map(d => d.genre)];
        const genreOptions = genres.map(g => `<option value="${g}">${g}</option>`).join('');

        controlsPanel.append('div')
            .attr('class', 'control-group')
            .html(`
                <h4>Filter Genre</h4>
                <select id="genre-select">
                    ${genreOptions}
                </select>
            `);

        controlsPanel.append('div')
            .attr('class', 'control-group')
            .html(`
                <h4>Time Period</h4>
                <select id="time-select">
                    <option value="all">All Years (1980-2015)</option>
                    <option value="1980s">1980s</option>
                    <option value="1990s">1990s</option>
                    <option value="2000s">2000s</option>
                    <option value="2010s">2010s</option>
                </select>
            `);

        controlsPanel.append('div')
            .attr('class', 'control-group')
            .html(`
                <h4>Minimum Movies</h4>
                <input type="range" id="count-slider" min="1" max="50" value="5" step="1">
                <div>Count: <span id="count-display">5</span></div>
            `);

        this.bindControls();
    }

    bindControls() {
        const self = this;

        d3.select('#genre-select').on('change', function() {
            self.selectedGenre = this.value;
            self.updateVisualization();
        });

        d3.select('#time-select').on('change', function() {
            self.timeRange = this.value;
            self.updateVisualization();
        });

        d3.select('#count-slider').on('input', function() {
            self.minMovieCount = +this.value;
            d3.select('#count-display').text(this.value);
            self.updateVisualization();
        });
    }

    createVisualization() {
        d3.select('#visualization').html('');

        this.svg = d3.select('#visualization')
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);

        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        this.updateVisualization();
    }

    getFilteredData() {
        let genreData = [...this.data.byGenre];

        if (this.timeRange !== 'all') {
            genreData = genreData.map(genre => {
                const filteredMovies = genre.movies.filter(movie => {
                    const decade = Math.floor(movie.year / 10) * 10;
                    switch (this.timeRange) {
                        case '1980s': return decade === 1980;
                        case '1990s': return decade === 1990;
                        case '2000s': return decade === 2000;
                        case '2010s': return decade === 2010;
                        default: return true;
                    }
                });

                if (filteredMovies.length === 0) return null;

                const stats = this.dataProcessor.calculateGroupStats ? 
                    this.dataProcessor.calculateGroupStats(filteredMovies) : 
                    this.calculateGroupStats(filteredMovies);

                return {
                    ...genre,
                    count: filteredMovies.length,
                    ...stats,
                    movies: filteredMovies
                };
            }).filter(d => d !== null);
        }

        genreData = genreData.filter(d => d.count >= this.minMovieCount);

        if (this.selectedGenre !== 'all') {
            genreData = genreData.filter(d => d.genre === this.selectedGenre);
        }

        return genreData;
    }

    calculateGroupStats(movies) {
        const budgets = movies.map(d => d.budget).filter(d => d > 0);
        const grosses = movies.map(d => d.gross).filter(d => d > 0);
        const profits = movies.map(d => d.profit);
        const ratings = movies.map(d => d.rating).filter(d => d > 0);

        return {
            avgBudget: d3.mean(budgets) || 0,
            avgGross: d3.mean(grosses) || 0,
            avgProfit: d3.mean(profits) || 0,
            avgRating: d3.mean(ratings) || 0,
            totalGross: d3.sum(grosses) || 0
        };
    }

    updateVisualization() {
        const data = this.getFilteredData();
        
        this.setupScales(data);
        this.createAxes();
        this.createBubbles(data);
        this.updateInsights();
    }

    setupScales(data) {
        this.xScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.avgBudget)])
            .range([0, this.width]);

        this.yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.avgGross)])
            .range([this.height, 0]);

        this.radiusScale = d3.scaleSqrt()
            .domain([0, d3.max(data, d => d.count)])
            .range([5, 50]);

        this.colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain(d3.extent(data, d => d.avgRating));
    }

    createAxes() {
        this.g.selectAll('.axis').remove();

        this.g.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale).tickFormat(d => this.dataProcessor.formatCurrency(d)));

        this.g.append('g')
            .attr('class', 'axis y-axis')
            .call(d3.axisLeft(this.yScale).tickFormat(d => this.dataProcessor.formatCurrency(d)));

        this.g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - this.margin.left)
            .attr('x', 0 - (this.height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('Average Revenue (USD)');

        this.g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', `translate(${this.width / 2}, ${this.height + this.margin.bottom})`)
            .style('text-anchor', 'middle')
            .text('Average Budget (USD)');

        this.g.selectAll('.grid-line').remove();
        this.g.selectAll('.grid-x')
            .data(this.xScale.ticks())
            .enter()
            .append('line')
            .attr('class', 'grid-line grid-x')
            .attr('x1', d => this.xScale(d))
            .attr('x2', d => this.xScale(d))
            .attr('y1', 0)
            .attr('y2', this.height);

        this.g.selectAll('.grid-y')
            .data(this.yScale.ticks())
            .enter()
            .append('line')
            .attr('class', 'grid-line grid-y')
            .attr('x1', 0)
            .attr('x2', this.width)
            .attr('y1', d => this.yScale(d))
            .attr('y2', d => this.yScale(d));
    }

    createBubbles(data) {
        const self = this;
        
        this.g.selectAll('.bubble').remove();

        const bubbles = this.g.selectAll('.bubble')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'bubble')
            .attr('cx', d => this.xScale(d.avgBudget))
            .attr('cy', d => this.yScale(d.avgGross))
            .attr('r', 0)
            .attr('fill', d => this.colorScale(d.avgRating))
            .on('mouseover', function(event, d) {
                d3.select(this).style('stroke', '#333').style('stroke-width', '3px');
                self.showTooltip(event, d);
            })
            .on('mouseout', function(event, d) {
                d3.select(this).style('stroke', '#fff').style('stroke-width', '1px');
                self.hideTooltip();
            })
            .on('click', function(event, d) {
                self.selectedGenre = d.genre;
                d3.select('#genre-select').property('value', d.genre);
                self.updateVisualization();
            });

        bubbles.transition()
            .duration(1000)
            .attr('r', d => this.radiusScale(d.count));

        this.addBubbleLabels(data);
        this.createColorLegend();
        this.createSizeLegend(data);
    }

    addBubbleLabels(data) {
        this.g.selectAll('.bubble-label').remove();

        this.g.selectAll('.bubble-label')
            .data(data.filter(d => d.count > 15))
            .enter()
            .append('text')
            .attr('class', 'bubble-label')
            .attr('x', d => this.xScale(d.avgBudget))
            .attr('y', d => this.yScale(d.avgGross))
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .style('fill', 'white')
            .style('pointer-events', 'none')
            .text(d => d.genre);
    }

    createColorLegend() {
        this.g.selectAll('.color-legend').remove();

        const colorLegend = this.g.append('g')
            .attr('class', 'color-legend')
            .attr('transform', `translate(${this.width - 150}, 20)`);

        colorLegend.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text('Average Rating');

        const legendHeight = 100;
        const legendWidth = 20;

        const defs = this.svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'color-gradient')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', legendHeight)
            .attr('x2', 0).attr('y2', 0);

        const stops = d3.range(0, 1.1, 0.1);
        stops.forEach(t => {
            gradient.append('stop')
                .attr('offset', `${t * 100}%`)
                .attr('stop-color', d3.interpolateViridis(t));
        });

        colorLegend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#color-gradient)');

        const colorScale = this.colorScale;
        const legendScale = d3.scaleLinear()
            .domain(colorScale.domain())
            .range([legendHeight, 0]);

        colorLegend.append('g')
            .attr('transform', `translate(${legendWidth}, 0)`)
            .call(d3.axisRight(legendScale).tickSize(5).tickFormat(d3.format('.1f')));
    }

    createSizeLegend(data) {
        this.g.selectAll('.size-legend').remove();

        const sizeLegend = this.g.append('g')
            .attr('class', 'size-legend')
            .attr('transform', `translate(50, ${this.height - 100})`);

        sizeLegend.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text('Number of Movies');

        const maxCount = d3.max(data, d => d.count);
        const sampleSizes = [5, Math.floor(maxCount / 2), maxCount];

        sampleSizes.forEach((size, i) => {
            const radius = this.radiusScale(size);
            sizeLegend.append('circle')
                .attr('cx', 0)
                .attr('cy', i * 30)
                .attr('r', radius)
                .style('fill', 'none')
                .style('stroke', '#333')
                .style('stroke-width', 1);

            sizeLegend.append('text')
                .attr('x', radius + 10)
                .attr('y', i * 30)
                .attr('dy', '0.35em')
                .style('font-size', '10px')
                .text(size);
        });
    }

    showTooltip(event, d) {
        this.tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        this.tooltip.html(`
            <strong>${d.genre}</strong><br/>
            Movies: ${d.count}<br/>
            Avg Budget: ${this.dataProcessor.formatCurrency(d.avgBudget)}<br/>
            Avg Revenue: ${this.dataProcessor.formatCurrency(d.avgGross)}<br/>
            Avg Rating: ${d.avgRating.toFixed(1)}/10<br/>
            Total Revenue: ${this.dataProcessor.formatCurrency(d.totalGross)}
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }

    hideTooltip() {
        this.tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    }

    addAnnotations() {
        try {
            const data = this.getFilteredData();
            if (!data || data.length === 0) return;
            
            // Static annotations that are always visible (requirement compliance)
            const annotations = [];
            
            // Find key genres for annotation
            const actionGenre = data.find(d => d.genre === 'Action');
            const adventureGenre = data.find(d => d.genre === 'Adventure');
            const comedyGenre = data.find(d => d.genre === 'Comedy');
            const dramaGenre = data.find(d => d.genre === 'Drama');
            
            // High-budget, high-revenue quadrant
            if (actionGenre) {
                annotations.push({
                    note: { 
                        label: "Action movies dominate the high-budget, high-revenue quadrant with average budgets over $50M", 
                        title: "Blockbuster Territory",
                        align: "middle",
                        wrap: 150
                    },
                    x: this.xScale(actionGenre.avgBudget),
                    y: this.yScale(actionGenre.avgGross),
                    dy: -70,
                    dx: 50,
                    connector: { end: "arrow" }
                });
            }
            
            // Quality vs Commercial success
            if (comedyGenre && dramaGenre) {
                const avgX = (this.xScale(comedyGenre.avgBudget) + this.xScale(dramaGenre.avgBudget)) / 2;
                const avgY = (this.yScale(comedyGenre.avgGross) + this.yScale(dramaGenre.avgGross)) / 2;
                
                annotations.push({
                    note: { 
                        label: "Comedy and Drama provide consistent moderate returns with balanced budget-to-revenue ratios", 
                        title: "Steady Performers",
                        align: "middle",
                        wrap: 160
                    },
                    x: avgX,
                    y: avgY,
                    dy: 80,
                    dx: -60,
                    connector: { end: "arrow" }
                });
            }
            
            // Genre diversity insight
            annotations.push({
                note: { 
                    label: `Analyzing ${data.length} genres reveals distinct budget-revenue clusters and investment strategies`, 
                    title: "Genre Diversity",
                    align: "middle",
                    wrap: 180
                },
                x: this.width / 2,
                y: 30,
                dy: -50,
                dx: 0,
                connector: { end: "none" }
            });

            if (annotations.length > 0) {
                const makeAnnotations = d3.annotation()
                    .type(d3.annotationLabel)
                    .annotations(annotations);

                this.g.selectAll('.annotation-group').remove();
                this.g.append('g')
                    .attr('class', 'annotation-group')
                    .call(makeAnnotations);
            }
            
            console.log('Scene 2 static annotations added');
        } catch (error) {
            console.error('Error adding Scene 2 annotations:', error);
        }
    }

    updateInsights() {
        const data = this.getFilteredData();
        
        const topByRevenue = [...data].sort((a, b) => b.avgGross - a.avgGross)[0];
        const topByRating = [...data].sort((a, b) => b.avgRating - a.avgRating)[0];
        const mostMovies = [...data].sort((a, b) => b.count - a.count)[0];

        const insights = [
            {
                title: "Revenue Leader",
                content: `<span class="highlight">${topByRevenue.genre}</span> movies generate the highest average revenue at ${this.dataProcessor.formatCurrency(topByRevenue.avgGross)} per film.`
            },
            {
                title: "Quality Champion",
                content: `<span class="highlight">${topByRating.genre}</span> films have the highest average rating of ${topByRating.avgRating.toFixed(1)}/10 based on audience reviews.`
            },
            {
                title: "Volume Leader",
                content: `<span class="highlight">${mostMovies.genre}</span> dominates production volume with ${mostMovies.count} films in the dataset.`
            }
        ];

        const annotationPanel = d3.select('#annotations');
        annotationPanel.html('');

        annotationPanel.selectAll('.insight-card')
            .data(insights)
            .enter()
            .append('div')
            .attr('class', 'insight-card')
            .html(d => `<h4>${d.title}</h4><p>${d.content}</p>`);
    }

    cleanup() {
        if (this.tooltip) {
            this.tooltip.remove();
        }
    }
}

window.Scene2 = Scene2;