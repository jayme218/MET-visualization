
let allData;

const headerDiv = d3.select(".header");
const vizDiv = d3.select("#visualization");
const controlsDiv = d3.select("#controls");
const tooltip = d3.select("#tooltip");

d3.csv("MetObjects_small.csv").then(function(data) {
    
    const departmentsToExclude = ["The Cloisters", "Robert Lehman Collection"];
    const filteredData = data.filter(d => !departmentsToExclude.includes(d.Department));

    // Convert relevant columns to numbers
    filteredData.forEach(d => {
        d["Object Begin Date"] = +d["Object Begin Date"];
    });
    
    allData = filteredData; 
    drawScene1(allData); // Start with Scene 1
}).catch(function(error) {
    console.error("Error loading the data:", error);
    vizDiv.text("Failed to load data. Please check if 'MetObjects_small.csv' is in the correct folder.");
});


/**
 * SCENE 1: Draws the Treemap of all departments
 */
function drawScene1(data) {
    vizDiv.html("");
    controlsDiv.html("");
    headerDiv.html(`
        <h1>The Metropolitan Museum of Art: A History in Data</h1>
        <p>Explore five thousand years of world history. Click on a department to begin your journey.</p>
        <p class="subheader">Tile size represents the number of artworks in each department.</p>
    `);

    const width = 1200;
    const height = 800;
    const svg = vizDiv.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("width", "100%").style("height", "auto");

    const counts = d3.rollup(data, v => v.length, d => d.Department);
    const rootData = { name: "root", children: Array.from(counts, ([name, value]) => ({ name, value })) };
    const root = d3.hierarchy(rootData).sum(d => d.value).sort((a, b) => b.value - a.value);
    const treemapLayout = d3.treemap().size([width, height]).padding(3);
    treemapLayout(root);

    const modernBluePalette = ["#004A7F", "#007CC2", "#333333", "#EAE0D5", "#56A8C7", "#A9A9A9", "#89CFF0", "#C5BCAF"];
    const color = d3.scaleOrdinal(modernBluePalette);

    const nodes = svg.selectAll("g.tile").data(root.leaves()).join("g")
        .attr("class", "tile")
        .attr("transform", d => `translate(${d.x0}, ${d.y0})`);

    nodes.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => color(d.data.name));

    nodes.append("text")
        .selectAll("tspan")
        .data(d => d.data.name.split(/(?=[A-Z][^A-Z])/g))
        .join("tspan")
        .attr("x", 5).attr("y", (d, i) => 15 + i * 12).text(d => d)
        .attr("display", function(d) {
            const nodeData = d3.select(this.parentNode).datum();
            return (nodeData.x1 - nodeData.x0) > 60 ? "inline" : "none";
        });

    nodes.on("click", (event, d) => {
        tooltip.style("opacity", 0); 
        const departmentName = d.data.name;
        drawScene2(allData, departmentName);
    })
    .on("mouseover", function(event, d) {
        tooltip.style("opacity", 1);
    })
    .on("mousemove", function(event, d) {
        tooltip.html(`<strong>${d.data.name}</strong><br>${d.data.value.toLocaleString()} artworks`)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseleave", function(event, d) {
        tooltip.style("opacity", 0);
    });
}


/**
 * SCENE 2: Draws a Bar Chart for a selected department
 */
function drawScene2(fullData, departmentName) {
    vizDiv.html("");
    headerDiv.html(`<h1>${departmentName}</h1><p>Distribution of artifacts over time. Click a bar to see individual works.</p>`);
    controlsDiv.html(`<button class="back-button">← Back to All Departments</button>`);

    const departmentData = fullData.filter(d => d.Department === departmentName);
    const centuryCounts = d3.rollup(departmentData, v => v.length, d => Math.floor(d["Object Begin Date"] / 100) * 100);
    const processedData = Array.from(centuryCounts, ([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year);

    const maxCount = d3.max(processedData, d => d.count);
    const threshold = Math.max(maxCount * 0.005, 5); 
    const finalProcessedData = processedData.filter(d => d.count > threshold);

    const margin = { top: 40, right: 30, bottom: 60, left: 70 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = vizDiv.append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().range([0, width]).domain(finalProcessedData.map(d => d.year)).padding(0.2);
    svg.append("g").attr("class", "x-axis").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x))
        .selectAll("text").attr("transform", "translate(-10,0)rotate(-45)").style("text-anchor", "end");

    const y = d3.scaleLinear().domain([0, d3.max(finalProcessedData, d => d.count)]).range([height, 0]);
    svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y));

    // Axis Labels
    svg.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .text("Number of Artworks");
    svg.append("text").attr("class", "axis-label")
        .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
        .text("Century");

    svg.selectAll("rect.bar").data(finalProcessedData).join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.year))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.count))
        .on("mouseover", function(event, d) { tooltip.style("opacity", 1); })
        .on("mousemove", function(event, d) {
            tooltip.html(`<strong>Period:</strong> ${d.year}s<br><strong>Artworks:</strong> ${d.count}`)
                .style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function(event, d) { tooltip.style("opacity", 0); })
        .on("click", (event, d) => { drawScene3(departmentData, departmentName, d.year); });
        
    const departmentInsights = {
        "European Paintings": [{ year: 1800, title: "Impressionism & Post-Impressionism", label: "A defining feature of The Met, this collection holds iconic works by Monet, Degas, and Van Gogh, capturing a revolutionary shift in art." }],
        "Drawings and Prints": [{ year: 1800, title: "The Age of Proliferation", label: "This peak reflects the explosion of print media like lithography, with rich holdings from artists like Goya, Daumier, and Whistler." }],
        "The American Wing": [{ year: 1800, title: "A Nation's Identity", label: "Captures the new nation's identity through landscape painting and extensive decorative arts from makers like Tiffany & Co." }],
        "Egyptian Art": [{ year: -1400, title: "New Kingdom Splendor", label: "The collection's strength lies in the New Kingdom, the age of pharaohs like Hatshepsut, and includes the monumental Temple of Dendur." }, { year: 100, title: "Roman Egypt", label: "This era is marked by the hauntingly realistic Faiyum mummy portraits, which blend Egyptian burial traditions with Greco-Roman painting styles." }],
        "Costume Institute": [{ year: 1900, title: "The Modern Wardrobe", label: "Documents the rise of haute couture and the dramatic evolution of the 20th-century silhouette, from Chanel to Dior." }],
        "Photographs": [{ year: 1900, title: "The Photographic Century", label: "Traces the medium's evolution from early modernism with Alfred Stieglitz to masters like Walker Evans and Diane Arbus." }],
        "Greek and Roman Art": [{ year: -500, title: "The Athenian Golden Age", label: "The collection's heart is in Classical Athens, with an extensive collection of red-figure vases that depict mythology and daily life." }, { year: 100, title: "The Roman Empire at its Height", label: "Showcases the power and artistry of the Roman Empire through monumental marble portraits of emperors and incredibly preserved frescoes from villas like Boscoreale." }],
        "Asian Art": [{ year: 1700, title: "Edo Japan & Qing China", label: "Holdings are richest in this period, with Japanese woodblock prints and a vast array of porcelains from China's Qing Dynasty." }],
        "Arms and Armor": [{ year: 1500, title: "The Renaissance Knight", label: "The collection peaks with the ornate parade armors of Renaissance kings and princes, including pieces made for King Henry VIII of England." }],
        "European Sculpture and Decorative Arts": [{ year: 1700, title: "Rococo & Neoclassical Splendor", label: "The collection is strongest in this century of aristocratic taste, featuring entire recreated French period rooms (boiseries) and exquisite Sèvres porcelain." }],
        "Modern and Contemporary Art": [{ year: 1900, title: "Post-War & Abstract Expressionism", label: "Features defining works of the New York School, including Jackson Pollock's iconic drip paintings and masterpieces by Willem de Kooning and Mark Rothko." }],
        "Islamic Art": [{ year: 800, title: "The Abbasid Caliphate", label: "This formative period of Islamic art is represented by developments in Kufic calligraphy and the sophisticated luster-painted ceramics from present-day Iraq." }],
        "Ancient Near Eastern Art": [{ year: 200, title: "The Sasanian Empire", label: "This period highlights the luxury arts of a major rival to Rome, exemplified by exquisite silver-gilt plates depicting royal hunts and courtly life." }],
        "Arts of Africa, Oceania, and the Americas": [{ year: 1800, title: "Ritual and Power", label: "The collection features powerful 19th-century ritual objects, such as the towering Asmat ancestor poles (bisj poles) from New Guinea and refined works from African kingdoms." }],
        "Medieval Art": [{ year: 300, title: "The Rise of Christian Art", label: "This collection reflects the transition from the Roman to the Byzantine Empire, with luxury ivory and silver objects that show early Christian iconography." }, { year: 1400, title: "Late Gothic & Early Renaissance", label: "Highlighted by treasures like the 'Belles Heures' of Jean de France, duc de Berry, a masterpiece of manuscript illumination from the Late Gothic period." }]
    };

    let annotationTarget;
    const insightsForDept = departmentInsights[departmentName];
    if (insightsForDept) {
        let bestInsight = null;
        let maxCount = -1;
        insightsForDept.forEach(insight => {
            const dataPoint = finalProcessedData.find(d => d.year === insight.year);
            if (dataPoint && dataPoint.count > maxCount) {
                maxCount = dataPoint.count;
                bestInsight = { ...dataPoint, ...insight };
            }
        });
        if (bestInsight) { annotationTarget = bestInsight; }
    }
    if (!annotationTarget) {
      const maxData = finalProcessedData.reduce((prev, current) => (prev.count > current.count) ? prev : current, {count: 0});
      if (maxData.count > 0) {
        annotationTarget = { ...maxData, title: "Highlight", label: `The ${maxData.year}s are the most represented period in this department.` };
      }
    }

    if (annotationTarget) {
        const targetX = x(annotationTarget.year) + x.bandwidth() / 2;
        const targetY = y(annotationTarget.count);
        const isLeft = targetX < width / 2;
        const annotations = [{ note: { label: annotationTarget.label, title: annotationTarget.title, wrap: 200, padding: 10, align: isLeft ? "left" : "right" }, x: targetX, y: targetY, dy: 0, dx: isLeft ? 100 : -100 }];
        const makeAnnotations = d3.annotation().type(d3.annotationLabel).annotations(annotations);
        svg.append("g").attr("class", "annotation-group").call(makeAnnotations);
    }
    d3.select(".back-button").on("click", () => drawScene1(allData));
}


/**
 * SCENE 3: Draws a Log-scaled Stacked Area Chart of Materials
 */
function drawScene3(departmentData, departmentName, year) {
    vizDiv.html("");
    headerDiv.html(`<h1>Materials of the ${year}s in ${departmentName}</h1><p>Each layer represents a material, scaled to show trends in both common and rare mediums. Hover to see details.</p>`);
    controlsDiv.html(`<button class="back-button">← Back to '${departmentName}'</button>`);

    const periodData = departmentData.filter(d => {
        const objectYear = d["Object Begin Date"];
        return objectYear >= year && objectYear < year + 100;
    });

    const mediumCounts = d3.rollup(periodData, v => v.length, d => d.Medium);
    const topMediums = Array.from(mediumCounts, ([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(d => d.name);

    const yearlyCounts = d3.rollup(periodData, 
        v => v.length, 
        d => d["Object Begin Date"], 
        d => topMediums.includes(d.Medium) ? d.Medium : "Other"
    );

    const dataForStacking = Array.from(yearlyCounts.entries()).map(([year, mediumMap]) => {
        const entry = { year };
        topMediums.forEach(m => entry[m] = mediumMap.get(m) || 0);
        entry["Other"] = mediumMap.get("Other") || 0;
        return entry;
    }).sort((a, b) => a.year - b.year);

    const keys = [...topMediums, "Other"];
    
    const margin = { top: 20, right: 30, bottom: 60, left: 80 };
    const width = 1000 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = vizDiv.append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(dataForStacking, d => d.year))
        .range([0, width]);
    svg.append("g").attr("class", "x-axis").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));

    const stack = d3.stack()
        .keys(keys)
        .offset(d3.stackOffsetNone);
    const stackedData = stack(dataForStacking);

    const y = d3.scaleSymlog()
        .domain([0, d3.max(stackedData, layer => d3.max(layer, d => d[1]))])
        .range([height, 0]);

    svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y).ticks(5, ".1s"));

    // Add Axis Labels
    svg.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .text("Number of Artworks (Log Scale)");
    svg.append("text").attr("class", "axis-label")
        .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 15})`)
        .text("Year of Creation");

    const color = d3.scaleOrdinal().domain(keys).range(d3.schemeSet3);

    const area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));

    svg.selectAll(".stream-layer")
        .data(stackedData)
        .join("path")
        .attr("class", "stream-layer")
        .style("fill", d => color(d.key))
        .attr("d", area)
        .on("mouseover", function(event, d) {
            d3.selectAll(".stream-layer").style("opacity", 0.3);
            d3.select(this).style("opacity", 1);
            tooltip.style("opacity", 1).html(`<strong>Material:</strong> ${d.key}`);
        })
        .on("mousemove", function(event, d) {
            tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function(event, d) {
            d3.selectAll(".stream-layer").style("opacity", 1);
            tooltip.style("opacity", 0);
        });

    d3.select(".back-button").on("click", () => drawScene2(allData, departmentName));
}