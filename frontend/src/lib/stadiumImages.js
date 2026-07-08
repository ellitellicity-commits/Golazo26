// Real photographs of the 16 WC2026 host stadiums, sourced from Wikimedia Commons
// (CC-licensed). Each entry is the Commons thumbnail URL (960px, resolved via the
// MediaWiki pageimages API so the width is guaranteed to render) plus a link to
// the Commons file page, which carries the photographer credit and licence.
//
// Sourcing discipline (Part F): imagery comes ONLY from Wikimedia Commons — never
// from MLS / Liga MX / club or league sites — matching the project's
// trademark-and-copyright caution. Keyed by the same stadium name as
// lib/stadiumData.js and lib/stadiumInfo.js.
//
// `file` is the Commons file page (https://commons.wikimedia.org/wiki/File:…),
// shown as the "Wikimedia Commons" credit link beside each photo.

const COMMONS = 'https://commons.wikimedia.org/wiki/File:'

// stadium name -> Commons filename (the segment the thumbnail + file page share)
const FILES = {
  'MetLife Stadium': 'Metlife_stadium_%28Aerial_view%29.jpg',
  'SoFi Stadium': 'SoFi_Stadium_2023.jpg',
  'AT&T Stadium': 'Arlington_June_2020_4_%28AT%26T_Stadium%29.jpg',
  'Arrowhead Stadium': 'Aerial_view_of_Arrowhead_Stadium_08-31-2013.jpg',
  'NRG Stadium': 'Nrg_stadium.jpg',
  'Mercedes-Benz Stadium': 'Mercedes_Benz_Stadium_time_lapse_capture_2017-08-13.jpg',
  'Hard Rock Stadium': 'Hard_Rock_Stadium_for_Super_Bowl_LIV_%2849606710103%29.jpg',
  'Lincoln Financial Field': 'Lincoln_Financial_Field_%28Aerial_view%29.jpg',
  'Gillette Stadium': 'Gillette_Stadium_%28Top_View%29.jpg',
  "Levi's Stadium": 'Levi%27s_Stadium_in_February_2016_prior_to_Super_Bowl_50_%2824398261729%29.jpg',
  'Lumen Field': '2026_FIFA_World_Cup_-_Belgium_v._Egypt_in_Seattle_-_04.jpg',
  'Estadio Azteca': 'Vista_a%C3%A9rea_del_Estadio_Azteca_-_2026_-_02.jpg',
  'Estadio Akron': 'Estadio_Akron_02-07-2022_cabecera_sur_lado_derecho_%283%29.jpg',
  'Estadio BBVA': 'Mexico_Guadalupe_Monterrey_Estadio_BBVA_Bancomer_fifa_world_cup_2026_6.JPG',
  'BC Place': 'BC_Place_2015_Women%27s_FIFA_World_Cup.jpg',
  'BMO Field': 'Toronto_BMO_Field_in_2024.jpg',
}

// Build the 960px Commons thumbnail URL for a filename. The MD5-based /a/ab/
// shard prefix is baked in per file (Commons requires it in the path).
const SHARD = {
  'Metlife_stadium_%28Aerial_view%29.jpg': '0/04',
  'SoFi_Stadium_2023.jpg': 'b/b3',
  'Arlington_June_2020_4_%28AT%26T_Stadium%29.jpg': '1/11',
  'Aerial_view_of_Arrowhead_Stadium_08-31-2013.jpg': 'a/ac',
  'Nrg_stadium.jpg': '3/3e',
  'Mercedes_Benz_Stadium_time_lapse_capture_2017-08-13.jpg': '1/10',
  'Hard_Rock_Stadium_for_Super_Bowl_LIV_%2849606710103%29.jpg': 'c/ce',
  'Lincoln_Financial_Field_%28Aerial_view%29.jpg': 'a/a1',
  'Gillette_Stadium_%28Top_View%29.jpg': 'd/db',
  'Levi%27s_Stadium_in_February_2016_prior_to_Super_Bowl_50_%2824398261729%29.jpg': 'a/a6',
  '2026_FIFA_World_Cup_-_Belgium_v._Egypt_in_Seattle_-_04.jpg': 'c/c8',
  'Vista_a%C3%A9rea_del_Estadio_Azteca_-_2026_-_02.jpg': '0/07',
  'Estadio_Akron_02-07-2022_cabecera_sur_lado_derecho_%283%29.jpg': '1/10',
  'Mexico_Guadalupe_Monterrey_Estadio_BBVA_Bancomer_fifa_world_cup_2026_6.JPG': '5/57',
  'BC_Place_2015_Women%27s_FIFA_World_Cup.jpg': 'f/ff',
  'Toronto_BMO_Field_in_2024.jpg': '9/91',
}

export const STADIUM_IMAGES = Object.fromEntries(
  Object.entries(FILES).map(([name, file]) => [
    name,
    {
      src: `https://upload.wikimedia.org/wikipedia/commons/thumb/${SHARD[file]}/${file}/960px-${file}`,
      file: `${COMMONS}${file}`,
    },
  ]),
)

export function stadiumImage(name) {
  return STADIUM_IMAGES[name] || null
}
