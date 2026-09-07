
const fs = require("fs");
let code = fs.readFileSync("src/pages/EventManagement.jsx", "utf8");

const uiInjection = `

                                    <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "5px 0" }} />

                                    {/* 3. Manage Terms & Conditions */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <h3 style={{ color: "var(--primary)", fontSize: "14px", fontWeight: "900", margin: "0 0 5px 0" }}>Terms & Conditions</h3>
                                        
                                        <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "5px", paddingRight: "5px" }}>
                                            {savedPdfTermsList && savedPdfTermsList.map((term, index) => (
                                                <label key={index} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11px", color: "rgba(255,255,255,0.8)", cursor: "pointer", lineHeight: "1.3" }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={pdfTerms && pdfTerms.includes(term)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setPdfTerms([...(pdfTerms || []), term]);
                                                            } else {
                                                                setPdfTerms((pdfTerms || []).filter(t => t !== term));
                                                            }
                                                        }}
                                                        style={{ marginTop: "2px", accentColor: "var(--primary)" }}
                                                    />
                                                    <span>{term}</span>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            const newList = savedPdfTermsList.filter(t => t !== term);
                                                            setSavedPdfTermsList(newList);
                                                            setPdfTerms((pdfTerms || []).filter(t => t !== term));
                                                            localStorage.setItem("fleetCrmPdfTerms", JSON.stringify(newList));
                                                        }}
                                                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "0 2px", marginLeft: "auto" }}
                                                        title="Delete Term"
                                                    >
                                                        ×
                                                    </button>
                                                </label>
                                            ))}
                                        </div>

                                        <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                                            <input 
                                                type="text" 
                                                className="premium-compact-input" 
                                                placeholder="Type new term..." 
                                                value={newTermText || ""} 
                                                onChange={(e) => setNewTermText(e.target.value)} 
                                                style={{ flex: 1 }}
                                            />
                                            <button 
                                                onClick={() => {
                                                    const trimmed = (newTermText || "").trim();
                                                    if (!trimmed) return;
                                                    if (savedPdfTermsList && savedPdfTermsList.includes(trimmed)) {
                                                        alert("Term already exists!");
                                                        return;
                                                    }
                                                    const newList = [...(savedPdfTermsList || []), trimmed];
                                                    setSavedPdfTermsList(newList);
                                                    setPdfTerms([...(pdfTerms || []), trimmed]);
                                                    localStorage.setItem("fleetCrmPdfTerms", JSON.stringify(newList));
                                                    setNewTermText("");
                                                }}
                                                className="primary-btn" 
                                                style={{ height: "40px", fontSize: "12px", padding: "0 10px", justifyContent: "center", minWidth: "60px" }}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>`;

if (!code.includes("Manage Terms & Conditions")) {
    code = code.replace(/Add Row[\s\S]*?<\/button>[\s\S]*?<\/div>/, (match) => match + uiInjection);
    fs.writeFileSync("src/pages/EventManagement.jsx", code);
    console.log("Injected UI via Regex!");
} else {
    console.log("UI already exists.");
}

