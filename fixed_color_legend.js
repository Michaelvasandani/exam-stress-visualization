// Function to add color legend to the 3D plot
function addColorLegend(container, colorScale, minValue, maxValue, metric) {
    const legend = document.createElement('div');
    legend.style.position = 'absolute';
    legend.style.bottom = '20px';
    legend.style.left = '20px';
    legend.style.width = '40px';
    legend.style.height = '200px';
    legend.style.backgroundColor = 'white';
    legend.style.borderRadius = '4px';
    legend.style.padding = '10px';
    legend.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    
    const gradient = document.createElement('div');
    gradient.style.width = '20px';
    gradient.style.height = '180px';
    gradient.style.margin = '0 auto';
    gradient.style.background = 'linear-gradient(to top, ' + 
        colorScale(0) + ' 0%, ' + 
        colorScale(0.2) + ' 20%, ' +
        colorScale(0.4) + ' 40%, ' +
        colorScale(0.6) + ' 60%, ' +
        colorScale(0.8) + ' 80%, ' +
        colorScale(1) + ' 100%)';
    
    legend.appendChild(gradient);
    
    const maxLabel = document.createElement('div');
    maxLabel.textContent = formatMetricValue(maxValue, metric);
    maxLabel.style.position = 'absolute';
    maxLabel.style.top = '0';
    maxLabel.style.right = '0';
    maxLabel.style.fontSize = '12px';
    
    const minLabel = document.createElement('div');
    minLabel.textContent = formatMetricValue(minValue, metric);
    minLabel.style.position = 'absolute';
    minLabel.style.bottom = '0';
    minLabel.style.right = '0';
    minLabel.style.fontSize = '12px';
    
    legend.appendChild(maxLabel);
    legend.appendChild(minLabel);
    
    container.appendChild(legend);
}
