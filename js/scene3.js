class Scene3 {
    constructor(container, data, dataProcessor) {
        this.container = container;
        this.data = data;
        this.dataProcessor = dataProcessor;
        this.margin = { top: 20, right: 20, bottom: 50, left: 80 };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;
        
        this.profitThreshold = 0;
        this.selectedMovies = [];
        this.showOutliers = true;
        this.colorBy = 'profit';
        
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
    }

    render() {
        try {
            console.log('Rendering Scene 3...');
            console.log('Data available:', this.data ? 'Yes' : 'No');
            console.log('Raw data length:', this.data?.raw?.length || 'N/A');
            
            this.setupControls();
            this.createVisualization();
            this.addAnnotations();
            this.updateInsights();
            
            console.log('Scene 3 rendered successfully');
        } catch (error) {
            console.error('Error rendering Scene 3:', error);
            throw error;
        }
    }

    setupControls() {
        const controlsPanel = d3.select('#controls-panel');
        controlsPanel.html('');

        controlsPanel.append('div')
            .attr('class', 'control-group')
            .html(`
                <h4>Profit Threshold</h4>
                <input type="range" id="profit-slider" min="0" max="500000000" value="0" step="10000000">
                <div>Min Profit: <span id="profit-display">$0</span></div>
            `);

        controlsPanel.append('div')
            .attr('class', 'control-group')
            .html(`
                <h4>Color By</h4>
                <select id="color-select">
                    <option value="profit">Profit</option>
                    <option value="rating">Rating</option>
                    <option value="genre">Genre</option>
                    <option value="roi">ROI</option>
                </select>
            `);

        controlsPanel.append('div')
            .attr('class', 'control-group')
            .html(`
                <h4>Highlight Top Movies</h4>
                <button class="toggle-btn active" id="outliers-btn">Show Outliers</button>
            `);

        const topMovies = this.data.topMovies.byProfit.slice(0, 10);
        const movieOptions = topMovies.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
        
        controlsPanel.append('div')
            .attr('class', 'control-group')
            .html(`
                <h4>Highlight Movie</h4>
                <select id="movie-select">
                    <option value="">Select a movie...</option>
                    ${movieOptions}
                </select>
            `);

        this.bindControls();
    }

    bindControls() {
        const self = this;

        d3.select('#profit-slider').on('input', function() {
            self.profitThreshold = +this.value;
            d3.select('#profit-display').text(self.dataProcessor.formatCurrency(this.value));
            self.updateVisualization();
        });

        d3.select('#color-select').on('change', function() {
            self.colorBy = this.value;
            self.updateVisualization();
        });

        d3.select('#outliers-btn').on('click', function() {
            self.showOutliers = !self.showOutliers;
            d3.select(this).classed('active', self.showOutliers);
            self.updateVisualization();
        });

        d3.select('#movie-select').on('change', function() {
            const movieName = this.value;
            if (movieName) {
                const movie = self.data.raw.find(m => m.name === movieName);
                if (movie) {
                    self.selectedMovies = [movie];
                } else {
                    self.selectedMovies = [];
                }
            } else {
                self.selectedMovies = [];
            }
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
        return this.data.raw.filter(d => d.profit >= this.profitThreshold && d.budget > 0 && d.gross > 0);
    }

    updateVisualization() {
        const data = this.getFilteredData();
        
        this.setupScales(data);
        this.createAxes();
        this.createScatterPlot(data);
        this.highlightOutliers(data);
        this.highlightSelectedMovies();
        this.updateInsights(data);
    }

    setupScales(data) {
        this.xScale = d3.scaleLog()
            .domain(d3.extent(data, d => d.budget))
            .range([0, this.width])
            .clamp(true);

        this.yScale = d3.scaleLog()
            .domain(d3.extent(data, d => d.gross))
            .range([this.height, 0])
            .clamp(true);

        switch (this.colorBy) {
            case 'profit':
                this.colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
                    .domain([0, d3.max(data, d => d.profit)]);
                break;
            case 'rating':
                this.colorScale = d3.scaleSequential(d3.interpolateViridis)
                    .domain(d3.extent(data.filter(d => d.rating > 0), d => d.rating));
                break;
            case 'genre':
                const genres = [...new Set(data.map(d => d.genre))];
                this.colorScale = d3.scaleOrdinal(d3.schemeSet3)
                    .domain(genres);
                break;
            case 'roi':
                this.colorScale = d3.scaleSequential(d3.interpolatePlasma)
                    .domain([1, d3.max(data.filter(d => d.roi < 50), d => d.roi)]);
                break;
        }
    }

    createAxes() {
        this.g.selectAll('.axis').remove();

        this.g.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale)
                .tickFormat(d => this.dataProcessor.formatCurrency(d))
                .ticks(5));

        this.g.append('g')
            .attr('class', 'axis y-axis')
            .call(d3.axisLeft(this.yScale)
                .tickFormat(d => this.dataProcessor.formatCurrency(d))
                .ticks(5));

        this.g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - this.margin.left)
            .attr('x', 0 - (this.height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('Box Office Revenue (USD)');

        this.g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', `translate(${this.width / 2}, ${this.height + this.margin.bottom})`)
            .style('text-anchor', 'middle')
            .text('Production Budget (USD)');

        // Add diagonal line for break-even
        this.g.append('line')
            .attr('x1', this.xScale(d3.min(this.getFilteredData(), d => d.budget)))
            .attr('y1', this.yScale(d3.min(this.getFilteredData(), d => d.budget)))
            .attr('x2', this.xScale(d3.max(this.getFilteredData(), d => d.budget)))
            .attr('y2', this.yScale(d3.max(this.getFilteredData(), d => d.budget)))
            .style('stroke', '#999')
            .style('stroke-dasharray', '5,5')
            .style('opacity', 0.5);

        this.g.append('text')
            .attr('x', this.width - 100)
            .attr('y', this.height - 20)
            .style('font-size', '10px')
            .style('fill', '#999')
            .text('Break-even line');
    }

    createScatterPlot(data) {
        const self = this;
        
        this.g.selectAll('.scatter-dot').remove();

        const dots = this.g.selectAll('.scatter-dot')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'scatter-dot')
            .attr('cx', d => this.xScale(d.budget))
            .attr('cy', d => this.yScale(d.gross))
            .attr('r', 0)
            .attr('fill', d => {
                switch (this.colorBy) {
                    case 'profit': return this.colorScale(d.profit);
                    case 'rating': return d.rating > 0 ? this.colorScale(d.rating) : '#ccc';
                    case 'genre': return this.colorScale(d.genre);
                    case 'roi': return this.colorScale(Math.min(d.roi, 50));
                    default: return '#1f77b4';
                }
            })
            .on('mouseover', function(event, d) {
                d3.select(this).attr('r', 8).style('stroke-width', '2px');
                self.showTooltip(event, d);
            })
            .on('mouseout', function(event, d) {
                const isSelected = self.selectedMovies.includes(d);
                d3.select(this).attr('r', isSelected ? 6 : 4).style('stroke-width', '1px');
                self.hideTooltip();
            });

        dots.transition()
            .duration(1000)
            .attr('r', 4);

        this.createColorLegend(data);
    }

    createColorLegend(data) {
        this.g.selectAll('.color-legend').remove();

        if (this.colorBy === 'genre') {
            this.createCategoricalLegend(data);
        } else {
            this.createContinuousLegend(data);
        }
    }

    createContinuousLegend(data) {
        const legend = this.g.append('g')
            .attr('class', 'color-legend')
            .attr('transform', `translate(${this.width - 150}, 20)`);

        let legendTitle = '';
        switch (this.colorBy) {
            case 'profit': legendTitle = 'Profit (USD)'; break;
            case 'rating': legendTitle = 'Rating (1-10)'; break;
            case 'roi': legendTitle = 'ROI (x)'; break;
        }

        legend.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text(legendTitle);

        const legendHeight = 100;
        const legendWidth = 15;

        const defs = this.svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', `${this.colorBy}-gradient`)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', legendHeight)
            .attr('x2', 0).attr('y2', 0);

        const stops = d3.range(0, 1.1, 0.1);
        stops.forEach(t => {
            const color = this.colorBy === 'profit' ? d3.interpolateRdYlGn(t) :
                         this.colorBy === 'rating' ? d3.interpolateViridis(t) :
                         d3.interpolatePlasma(t);
            gradient.append('stop')
                .attr('offset', `${t * 100}%`)
                .attr('stop-color', color);
        });

        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', `url(#${this.colorBy}-gradient)`);

        const legendScale = d3.scaleLinear()
            .domain(this.colorScale.domain())
            .range([legendHeight, 0]);

        legend.append('g')
            .attr('transform', `translate(${legendWidth}, 0)`)
            .call(d3.axisRight(legendScale).tickSize(3).ticks(5));
    }

    createCategoricalLegend(data) {
        const genres = [...new Set(data.map(d => d.genre))].slice(0, 8);
        
        const legend = this.g.append('g')
            .attr('class', 'color-legend')
            .attr('transform', `translate(${this.width - 120}, 20)`);

        legend.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text('Genre');

        const legendItems = legend.selectAll('.legend-item')
            .data(genres)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 15})`);

        legendItems.append('circle')
            .attr('r', 5)
            .attr('fill', d => this.colorScale(d));

        legendItems.append('text')
            .attr('x', 10)
            .attr('y', 0)
            .attr('dy', '0.35em')
            .style('font-size', '10px')
            .text(d => d);
    }

    highlightOutliers(data) {
        if (!this.showOutliers) return;

        const topProfitMovies = [...data].sort((a, b) => b.profit - a.profit).slice(0, 5);
        const highROIMovies = [...data].filter(d => d.budget > 1000000).sort((a, b) => b.roi - a.roi).slice(0, 3);
        
        const outliers = [...new Set([...topProfitMovies, ...highROIMovies])];
        
        this.g.selectAll('.outlier-circle').remove();
        this.g.selectAll('.outlier-label').remove();

        this.g.selectAll('.outlier-circle')
            .data(outliers)
            .enter()
            .append('circle')
            .attr('class', 'outlier-circle')
            .attr('cx', d => this.xScale(d.budget))
            .attr('cy', d => this.yScale(d.gross))
            .attr('r', 8)
            .style('fill', 'none')
            .style('stroke', '#ff6b6b')
            .style('stroke-width', 2)
            .style('stroke-dasharray', '3,3');

        this.g.selectAll('.outlier-label')
            .data(outliers)
            .enter()
            .append('text')
            .attr('class', 'outlier-label')
            .attr('x', d => this.xScale(d.budget))
            .attr('y', d => this.yScale(d.gross) - 15)
            .attr('text-anchor', 'middle')
            .style('font-size', '9px')
            .style('font-weight', 'bold')
            .style('fill', '#ff6b6b')
            .text(d => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name);
    }

    highlightSelectedMovies() {
        this.g.selectAll('.selected-circle').remove();
        
        if (this.selectedMovies.length === 0) return;

        this.g.selectAll('.selected-circle')
            .data(this.selectedMovies)
            .enter()
            .append('circle')
            .attr('class', 'selected-circle')
            .attr('cx', d => this.xScale(d.budget))
            .attr('cy', d => this.yScale(d.gross))
            .attr('r', 10)
            .style('fill', 'none')
            .style('stroke', '#FFD700')
            .style('stroke-width', 3);
    }

    showTooltip(event, d) {
        this.tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        this.tooltip.html(`
            <strong>${d.name}</strong><br/>
            Year: ${d.year}<br/>
            Genre: ${d.genre}<br/>
            Budget: ${this.dataProcessor.formatCurrency(d.budget)}<br/>
            Revenue: ${this.dataProcessor.formatCurrency(d.gross)}<br/>
            Profit: ${this.dataProcessor.formatCurrency(d.profit)}<br/>
            ROI: ${d.roi.toFixed(1)}x<br/>
            Rating: ${d.rating}/10<br/>
            Runtime: ${d.runtime} min
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
            if (!this.xScale || !this.yScale) {
                console.log('Skipping annotations - scales not ready');
                return;
            }
            
            const data = this.getFilteredData();
            if (!data || data.length === 0) {
                console.log('No data for annotations');
                return;
            }
            
            // Static annotations that are always visible (requirement compliance)
            const annotations = [];
            
            // Find key movies for annotation
            const topProfit = [...data].sort((a, b) => b.profit - a.profit)[0];
            const topROI = [...data].filter(d => d.budget > 1000000).sort((a, b) => b.roi - a.roi)[0];
            const breakEvenMovies = data.filter(d => Math.abs(d.gross - d.budget) / d.budget < 0.1);

            // Success formula annotation
            if (topProfit) {
                annotations.push({
                    note: { 
                        label: `${topProfit.name} exemplifies the blockbuster formula: high budget (${this.dataProcessor.formatCurrency(topProfit.budget)}) yields massive profits`, 
                        title: "Blockbuster Success",
                        align: "middle",
                        wrap: 180
                    },
                    x: this.xScale(topProfit.budget),
                    y: this.yScale(topProfit.gross),
                    dy: -80,
                    dx: 60,
                    connector: { end: "arrow" }
                });
            }
            
            // Efficiency annotation
            if (topROI && topROI !== topProfit) {
                annotations.push({
                    note: { 
                        label: `${topROI.name} shows how smaller budgets can achieve exceptional returns (${topROI.roi.toFixed(1)}x ROI)`, 
                        title: "Efficiency Champion",
                        align: "middle",
                        wrap: 170
                    },
                    x: this.xScale(topROI.budget),
                    y: this.yScale(topROI.gross),
                    dy: 70,
                    dx: -80,
                    connector: { end: "arrow" }
                });
            }
            
            // Break-even line annotation
            annotations.push({
                note: { 
                    label: "Movies below this line fail to recoup their production costs, while those above generate profits", 
                    title: "Break-Even Threshold",
                    align: "middle",
                    wrap: 200
                },
                x: this.width * 0.7,
                y: this.height * 0.3,
                dy: -40,
                dx: -100,
                connector: { end: "arrow" }
            });
            
            // Industry insight
            const profitableCount = data.filter(d => d.profit > 0).length;
            const profitablePercent = ((profitableCount / data.length) * 100).toFixed(0);
            
            annotations.push({
                note: { 
                    label: `${profitablePercent}% of movies in this dataset generated profits, revealing the inherent risks in film investment`, 
                    title: "Industry Reality",
                    align: "middle",
                    wrap: 190
                },
                x: this.width / 2,
                y: 20,
                dy: -40,
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
                
            console.log('Scene 3 static annotations added successfully');
        } catch (error) {
            console.error('Error adding Scene 3 annotations:', error);
        }
    }

    updateInsights(data) {
        try {
            if (!data || data.length === 0) {
                console.log('No data for Scene 3 insights');
                const annotationPanel = d3.select('#annotations');
                annotationPanel.html('<div class="insight-card"><h4>Insights</h4><p>No data available for current filters.</p></div>');
                return;
            }
            
            const topProfit = [...data].sort((a, b) => b.profit - a.profit).slice(0, 3);
            const topROI = [...data].filter(d => d.budget > 1000000).sort((a, b) => b.roi - a.roi).slice(0, 3);
            const sweetSpotMovies = data.filter(d => d.runtime >= 90 && d.runtime <= 120);
            const avgRuntimeSuccess = d3.mean(sweetSpotMovies, d => d.profit) || 0;
            const allAvgProfit = d3.mean(data, d => d.profit) || 1;

            const insights = [
                {
                    title: "Profit Champions",
                    content: topProfit.length > 0 ? 
                        `Top 3 most profitable films: <span class="highlight">${topProfit.map(d => d.name).join(', ')}</span> with combined profits of ${this.dataProcessor.formatCurrency(d3.sum(topProfit, d => d.profit))}.` :
                        'No profitable movies found in current selection.'
                },
                {
                    title: "ROI Masters",
                    content: topROI.length > 0 ?
                        `Best ROI films: <span class="highlight">${topROI.map(d => d.name).join(', ')}</span> with returns of ${topROI.map(d => d.roi.toFixed(1) + 'x').join(', ')}.` :
                        'No high-budget ROI data available.'
                },
                {
                    title: "Runtime Sweet Spot",
                    content: sweetSpotMovies.length > 0 ?
                        `Movies between 90-120 minutes average <span class="highlight">${((avgRuntimeSuccess / allAvgProfit - 1) * 100).toFixed(1)}% higher profits</span> than other runtime ranges.` :
                        'Insufficient runtime data for analysis.'
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
                
            console.log('Scene 3 insights updated successfully');
        } catch (error) {
            console.error('Error updating Scene 3 insights:', error);
            const annotationPanel = d3.select('#annotations');
            annotationPanel.html('<div class="insight-card"><h4>Insights</h4><p>Error processing insights. Please try refreshing.</p></div>');
        }
    }

    cleanup() {
        if (this.tooltip) {
            this.tooltip.remove();
        }
    }
}

window.Scene3 = Scene3;