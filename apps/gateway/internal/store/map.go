package store

func Map() map[string]string {
	n := map[string]string{
		"acme.localhost": "http://localhost:9000",
		"foo.localhost":  "http://localhost:9000",
	}

	return n
}
