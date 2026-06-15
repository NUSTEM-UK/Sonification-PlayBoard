# Sample Data

This folder contains synthetic, proxy-style CSVs for the classic hockey-stick shape in atmospheric CO2 and global temperature, plus one real official instrumental companion dataset.

Use `hockey-stick-co2-temp.csv` for a compact overview and `hockey-stick-co2-temp-dense.csv` for a more detailed visualisation and sonification pass. The first column is time in thousands of years before present, so it is ignored by the importer and the numeric columns become draggable recorded channels.

`real-noaa-nasa-co2-temp.csv` is a real official dataset built from NOAA GML annual global CO2 means and NASA GISTEMP global annual temperature anomaly means.

Source references:

- Synthetic proxy context: NOAA Global Monitoring Laboratory CO2 history animation and long-record context: https://gml.noaa.gov/ccgg/trends/history.html
- Synthetic proxy context: IPCC AR6 WGI, paleoclimate and recent warming chapters: https://www.ipcc.ch/report/ar6/wg1/
- Real CO2 source: NOAA GML global annual mean CO2 CSV: https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_gl.csv
- Real temperature source: NASA GISS global annual mean temperature CSV: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv
- Note: the synthetic files are classroom-friendly approximations of the long hockey-stick shape; the real file is a modern instrumental record, not a paleoclimate reconstruction.
- `hockey-stick-co2-temp.csv`: compact classroom example.
- `hockey-stick-co2-temp-dense.csv`: denser version for smoother visualization and sonification.

## Source References

These CSVs are intentionally synthetic and are meant to be classroom-friendly proxies, not direct scientific reconstructions. The trend shape is loosely informed by the following references:

- EPICA Community Members, "Eight glacial cycles from an Antarctic ice core", Nature (2004): https://doi.org/10.1038/nature02599
- Bereiter et al., "Revision of the EPICA Dome C CO2 record from 800 to 600 kyr before present", Earth System Science Data (2015): https://doi.org/10.5194/essd-7-149-2015
- NOAA Global Monitoring Laboratory, Trends in Atmospheric Carbon Dioxide: https://gml.noaa.gov/ccgg/trends/
- NOAA NCEI, Global Climate at a Glance: https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series
