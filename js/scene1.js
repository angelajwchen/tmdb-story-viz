class Scene1 {
    constructor(container, data, dataProcessor) {
        this.container = container;
        this.data = data;
        this.dataProcessor = dataProcessor;
        this.margin = { top: 20, right: 20, bottom: 50, left: 80 };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;
        
        this.currentYear = 2015;
        this.showBudget = true;
        this.showRevenue = true;
        this.showProfit = true;
        
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
    }

    render() {
        try {
            console.log('Rendering Scene 1...');
            console.log('Data available:', this.data ? 'Yes' : 'No');
            console.log('Data byYear length:', this.data?.byYear?.length || 'N/A');
            
            this.setupControls();
            this.createVisualization();
            this.addAnnotations();
            this.updateInsights();
            
            console.log('Scene 1 rendered successfully');
        } catch (error) {
            console.error('Error rendering Scene 1:', error);
            throw error;
        }
    }

    setupControls() {
        const controlsPanel = d3.select('#controls-panel');
        controlsPanel.html('');

        controlsPanel.append('div')
            .attr('class', 'control-group')
            .html(`
                <h4>Time Range</h4>
                <input type="range" id="year-slider" min="1980" max="2015" value="2015" step="1">
                <div>Year: <span id="year-display">2015</span></div>
            `);

        controlsPanel.append('div')
            .attr('class', 'control-group')
            .html(`
                <h4>Show Metrics</h4>
                <button class="toggle-btn active" data-metric="budget">Budget</button>
                <button class="toggle-btn active" data-metric="revenue">Revenue</button>
                <button class="toggle-btn active" data-metric="profit">Profit</button>
            `);

        this.bindControls();
    }

    bindControls() {
        const self = this;

        d3.select('#year-slider').on('input', function() {
            self.currentYear = +this.value;
            d3.select('#year-display').text(this.value);
            self.updateVisualization();
        });

        d3.selectAll('.toggle-btn').on('click', function() {
            const metric = d3.select(this).attr('data-metric');
            const isActive = d3.select(this).classed('active');
            
            d3.select(this).classed('active', !isActive);
            
            if (metric === 'budget') self.showBudget = !isActive;
            if (metric === 'revenue') self.showRevenue = !isActive;
            if (metric === 'profit') self.showProfit = !isActive;
            
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

        this.setupScales();
        this.createAxes();
        this.createLines();
        this.createLegend();
    }

    setupScales() {
        try {
            if (!this.data || !this.data.byYear || this.data.byYear.length === 0) {
                throw new Error('No byYear data available for scaling');
            }
            
            const filteredData = this.data.byYear.filter(d => d.year <= this.currentYear);
            console.log('Filtered data for scales:', filteredData.length, 'data points');
            
            if (filteredData.length === 0) {
                throw new Error('No data points after filtering');
            }
            
            this.xScale = d3.scaleLinear()
                .domain(d3.extent(filteredData, d => d.year))
                .range([0, this.width]);

            const budgetExtent = d3.extent(filteredData, d => d.avgBudget);
            const revenueExtent = d3.extent(filteredData, d => d.avgGross);
            const profitExtent = d3.extent(filteredData, d => d.avgProfit);

            const allValues = [];
            if (this.showBudget) allValues.push(...budgetExtent);
            if (this.showRevenue) allValues.push(...revenueExtent);
            if (this.showProfit) allValues.push(...profitExtent);

            this.yScale = d3.scaleLinear()
                .domain([0, d3.max(allValues)])
                .range([this.height, 0]);
                
            console.log('Scales set up successfully');
        } catch (error) {
            console.error('Error setting up scales:', error);
            throw error;
        }
    }

    createAxes() {
        this.g.selectAll('.axis').remove();

        this.g.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale).tickFormat(d3.format('d')));

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
            .text('Average Amount (USD)');

        this.g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', `translate(${this.width / 2}, ${this.height + this.margin.bottom})`)
            .style('text-anchor', 'middle')
            .text('Year');

        this.g.selectAll('.grid-line').remove();
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

    createLines() {
        const filteredData = this.data.byYear.filter(d => d.year <= this.currentYear);
        
        this.g.selectAll('.line').remove();
        this.g.selectAll('.dot').remove();

        const line = d3.line()
            .x(d => this.xScale(d.year))
            .curve(d3.curveMonotoneX);

        const metrics = [
            { key: 'avgBudget', show: this.showBudget, class: 'budget', label: 'Budget' },
            { key: 'avgGross', show: this.showRevenue, class: 'revenue', label: 'Revenue' },
            { key: 'avgProfit', show: this.showProfit, class: 'profit', label: 'Profit' }
        ];

        metrics.forEach(metric => {
            if (metric.show) {
                line.y(d => this.yScale(d[metric.key]));
                
                this.g.append('path')
                    .datum(filteredData)
                    .attr('class', `line ${metric.class}`)
                    .attr('d', line)
                    .style('opacity', 0)
                    .transition()
                    .duration(1000)
                    .style('opacity', 0.8);

                this.g.selectAll(`.dot.${metric.class}`)
                    .data(filteredData)
                    .enter()
                    .append('circle')
                    .attr('class', `dot ${metric.class}`)
                    .attr('cx', d => this.xScale(d.year))
                    .attr('cy', d => this.yScale(d[metric.key]))
                    .attr('r', 0)
                    .on('mouseover', (event, d) => this.showTooltip(event, d, metric))
                    .on('mouseout', () => this.hideTooltip())
                    .transition()
                    .duration(1000)
                    .attr('r', 4);
            }
        });
    }

    createLegend() {
        this.g.selectAll('.legend').remove();

        const legend = this.g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width - 120}, 20)`);

        const legendItems = [
            { class: 'budget', label: 'Average Budget', show: this.showBudget },
            { class: 'revenue', label: 'Average Revenue', show: this.showRevenue },
            { class: 'profit', label: 'Average Profit', show: this.showProfit }
        ].filter(d => d.show);

        const legendItem = legend.selectAll('.legend-item')
            .data(legendItems)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 20})`);

        legendItem.append('line')
            .attr('x1', 0)
            .attr('x2', 15)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('class', d => `line ${d.class}`)
            .style('stroke-width', 3);

        legendItem.append('text')
            .attr('x', 20)
            .attr('y', 0)
            .attr('dy', '0.35em')
            .style('font-size', '12px')
            .text(d => d.label);
    }

    showTooltip(event, d, metric) {
        const value = d[metric.key];
        this.tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        this.tooltip.html(`
            <strong>Year: ${d.year}</strong><br/>
            ${metric.label}: ${this.dataProcessor.formatCurrency(value)}<br/>
            Movies: ${d.count}
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }

    hideTooltip() {
        this.tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    }

    updateVisualization() {
        this.setupScales();
        this.createAxes();
        this.createLines();
        this.createLegend();
        this.updateInsights();
    }

    addAnnotations() {
        try {
            if (!this.xScale || !this.yScale) {
                console.log('Skipping annotations - scales not ready');
                return;
            }
            
            // Static annotations that are always visible (requirement compliance)
            const filteredData = this.data.byYear.filter(d => d.year <= this.currentYear);
            
            // Find actual data points for accurate annotation positioning
            const crisis2009 = filteredData.find(d => d.year === 2009);
            const blockbuster2005 = filteredData.find(d => d.year >= 2005 && d.year <= 2007);
            
            const annotations = [];
            
            if (crisis2009) {
                annotations.push({
                    note: { 
                        label: "Movie budgets dropped during the financial crisis, affecting industry investment patterns", 
                        title: "2009 Financial Crisis Impact",
                        align: "middle",
                        wrap: 200
                    },
                    x: this.xScale(crisis2009.year),
                    y: this.yScale(crisis2009.avgBudget),
                    dy: -80,
                    dx: 50,
                    connector: { end: "arrow" }
                });
            }
            
            if (blockbuster2005) {
                annotations.push({
                    note: { 
                        label: "The mid-2000s marked the beginning of the big-budget blockbuster era with significantly higher production costs", 
                        title: "Rise of Blockbuster Era",
                        align: "middle",
                        wrap: 200
                    },
                    x: this.xScale(blockbuster2005.year),
                    y: this.yScale(blockbuster2005.avgBudget),
                    dy: 60,
                    dx: -80,
                    connector: { end: "arrow" }
                });
            }
            
            // Add trend annotation for overall growth
            const firstYear = filteredData[0];
            const lastYear = filteredData[filteredData.length - 1];
            if (firstYear && lastYear && this.currentYear >= 2010) {
                const growth = ((lastYear.avgBudget - firstYear.avgBudget) / firstYear.avgBudget * 100).toFixed(0);
                annotations.push({
                    note: { 
                        label: `Overall budget growth: ${growth}% increase from ${firstYear.year} to ${lastYear.year}`, 
                        title: "Industry Growth Trend",
                        align: "middle",
                        wrap: 180
                    },
                    x: this.xScale(firstYear.year + (lastYear.year - firstYear.year) / 2),
                    y: this.yScale(d3.max(filteredData, d => d.avgBudget)) + 20,
                    dy: -60,
                    dx: 0,
                    connector: { end: "none" }
                });
            }

            if (annotations.length > 0) {
                const makeAnnotations = d3.annotation()
                    .type(d3.annotationLabel)
                    .annotations(annotations);

                this.g.selectAll('.annotation-group').remove();
                this.g.append('g')
                    .attr('class', 'annotation-group')
                    .call(makeAnnotations);
            }
                
            console.log('Static annotations added successfully');
        } catch (error) {
            console.error('Error adding annotations:', error);
        }
    }

    updateInsights() {
        try {
            if (!this.data || !this.data.byYear || this.data.byYear.length === 0) {
                console.log('No data available for insights');
                return;
            }
            
            const currentData = this.data.byYear.filter(d => d.year <= this.currentYear);
            
            if (currentData.length === 0) {
                console.log('No data for current year range');
                return;
            }
            
            const latestYear = currentData[currentData.length - 1];
            const firstYear = currentData[0];
            
            const budgetGrowth = ((latestYear.avgBudget - firstYear.avgBudget) / firstYear.avgBudget * 100).toFixed(1);
            const revenueGrowth = ((latestYear.avgGross - firstYear.avgGross) / firstYear.avgGross * 100).toFixed(1);

            const insights = [
                {
                    title: "Budget Evolution",
                    content: `From ${firstYear.year} to ${latestYear.year}, average movie budgets grew by <span class="highlight">${budgetGrowth}%</span>, reaching ${this.dataProcessor.formatCurrency(latestYear.avgBudget)}.`
                },
                {
                    title: "Revenue Trends",
                    content: `Average movie revenues increased by <span class="highlight">${revenueGrowth}%</span> over the same period, indicating growing market expansion.`
                },
                {
                    title: "Industry Growth",
                    content: `The movie industry produced <span class="highlight">${currentData.reduce((sum, d) => sum + d.count, 0)} films</span> during this period with total box office of ${this.dataProcessor.formatCurrency(currentData.reduce((sum, d) => sum + d.totalGross, 0))}.`
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
                
            console.log('Insights updated successfully');
        } catch (error) {
            console.error('Error updating insights:', error);
            // Don't throw - just show basic message
            const annotationPanel = d3.select('#annotations');
            annotationPanel.html('<div class="insight-card"><h4>Insights</h4><p>Processing data...</p></div>');
        }
    }

    cleanup() {
        if (this.tooltip) {
            this.tooltip.remove();
        }
    }
}

window.Scene1 = Scene1;