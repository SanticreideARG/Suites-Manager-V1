-- Textos del hero de la landing (se guardan en la fila única de config)
ALTER TABLE config
  ADD COLUMN landing_tagline VARCHAR(200),
  ADD COLUMN landing_subtitulo VARCHAR(400),
  ADD COLUMN landing_cta_texto VARCHAR(80),
  ADD COLUMN landing_cta_url VARCHAR(200);

-- Fotos del slider del hero (almacenadas en Vercel Blob)
CREATE TABLE landing_fotos (
  id         SERIAL PRIMARY KEY,
  url        TEXT NOT NULL,
  alt_texto  VARCHAR(200),
  orden      SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_landing_fotos_orden ON landing_fotos (orden);

-- Links del footer
CREATE TABLE landing_links (
  id     SERIAL PRIMARY KEY,
  label  VARCHAR(120) NOT NULL,
  url    VARCHAR(300) NOT NULL,
  orden  SMALLINT NOT NULL DEFAULT 0,
  activa BOOLEAN NOT NULL DEFAULT true
);
